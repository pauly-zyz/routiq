// Live Elysium data (the launch chain) via our cached /api/chain endpoint. One shared poller for the whole page.
interface ChainState {
  status: 'connecting' | 'live' | 'down'
  block: number | null
  gasWei: string | null
  blockTimeMs: number | null
  seen: number
  series: number[] // blocks per second between polls
}

const POLL_MS = 4000
let started = false

export function useChain() {
  const state = useState<ChainState>('chain', () => ({
    status: 'connecting', block: null, gasWei: null, blockTimeMs: null, seen: 0, series: []
  }))

  if (import.meta.client && !started) {
    started = true
    let fails = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let first: { block: number, at: number } | null = null
    let last: { block: number, at: number } | null = null

    const poll = async () => {
      try {
        // Our own endpoint (server/api/chain.get.ts): cached at the CDN, keeps any RPC key server-side.
        const res = await fetch('/api/chain', { headers: { accept: 'application/json' } })
        if (!res.ok) throw new Error(`chain ${res.status}`)
        const data = await res.json() as { block: number, gasWei: string, at: number }
        const { block, at } = data
        first ??= { block, at }
        if (last && at > last.at && block !== last.block) {
          state.value.series = [...state.value.series, ((block - last.block) / (at - last.at)) * 1000].slice(-30)
        }
        if (!last || at > last.at) last = { block, at }
        const seen = block - first.block
        state.value.block = block
        state.value.gasWei = data.gasWei
        state.value.seen = seen
        state.value.blockTimeMs = seen > 0 ? (at - first.at) / seen : null
        state.value.status = 'live'
        fails = 0
      } catch {
        fails++
        if (fails >= 2) state.value.status = 'down'
      }
      timer = setTimeout(poll, fails > 3 ? POLL_MS * 4 : POLL_MS)
    }

    document.addEventListener('visibilitychange', () => {
      clearTimeout(timer)
      if (!document.hidden) poll()
    })
    poll()
  }

  const gasGwei = computed(() => (state.value.gasWei === null ? null : Number(state.value.gasWei) / 1e9))
  return { state, gasGwei }
}

export function formatGwei(g: number | null) {
  if (g === null) return '—'
  if (g === 0) return '0'
  if (g < 0.001) return g.toExponential(1)
  return g < 1 ? g.toFixed(3) : g.toFixed(2)
}
