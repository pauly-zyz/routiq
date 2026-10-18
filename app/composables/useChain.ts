// Live Robinhood Chain data from the public RPC. One shared poller for the whole page.
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
    const rpcUrl = useRuntimeConfig().public.rpcUrl
    let fails = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let first: { block: number, at: number } | null = null
    let last: { block: number, at: number } | null = null

    const rpc = async (method: string) => {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params: [] })
      })
      if (!res.ok) throw new Error(`RPC ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      return json.result as string
    }

    const poll = async () => {
      try {
        const [blockHex, gasHex] = await Promise.all([rpc('eth_blockNumber'), rpc('eth_gasPrice')])
        const block = Number(BigInt(blockHex))
        const at = performance.now()
        first ??= { block, at }
        if (last && at > last.at) {
          state.value.series = [...state.value.series, ((block - last.block) / (at - last.at)) * 1000].slice(-30)
        }
        last = { block, at }
        const seen = block - first.block
        state.value.block = block
        state.value.gasWei = BigInt(gasHex).toString()
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
