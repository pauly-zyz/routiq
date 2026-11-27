<script setup lang="ts">
// Review-and-sign page for transactions built by ROUTIQ action tools.
// Everything shown here is decoded and simulated by the server from the calldata itself, never taken from the link text.
useSeoMeta({ title: 'Review & sign | ROUTIQ', robots: 'noindex, nofollow' })

interface Inspect {
  ok: boolean
  error?: string
  from?: string
  expired?: boolean
  involvesStockToken?: boolean
  chain?: { key: WalletChainKey, id: number, name: string, nativeSymbol: string, explorer: string | null }
  steps?: { title: string, detail: string }[]
  simulation?: { ok: boolean, steps: { ok: boolean, gasUsed: number, error?: string }[] }
  estimatedNetworkFee?: string | null
  transactions?: { to: string, data: string, value: string }[]
}
type StepState = 'idle' | 'wallet' | 'pending' | 'done' | 'failed'

const { account, onChain, connect, addNetwork, short } = useWallet()
const toast = useToast()
const payload = ref('')
const info = ref<Inspect | null>(null)
const loading = ref(true)
const eligible = ref(false)
const running = ref(false)
const states = ref<StepState[]>([])
const hashes = ref<(string | null)[]>([])
const finished = ref(false)
const linkChain = computed<WalletChainKey>(() => info.value?.chain?.key ?? SITE.defaultChain)
const chainName = computed(() => info.value?.chain?.name ?? SITE.chains[linkChain.value].chainName)
const chainOk = computed(() => onChain(linkChain.value))
const txUrl = (h: string) => (info.value?.chain?.explorer ? `${info.value.chain.explorer}/tx/${h}` : null)

async function inspect() {
  loading.value = true
  try {
    info.value = await $fetch<Inspect>('/api/sign/inspect', { method: 'POST', body: { payload: payload.value } })
  } catch (err: any) {
    info.value = err?.data?.error ? err.data : { ok: false, error: 'Could not check this link right now. Try again in a moment.' }
  } finally {
    loading.value = false
    const n = info.value?.transactions?.length ?? 0
    states.value = Array(n).fill('idle')
    hashes.value = Array(n).fill(null)
  }
}

function load() {
  payload.value = window.location.hash.slice(1)
  info.value = null
  eligible.value = false
  finished.value = false
  if (payload.value) inspect()
  else loading.value = false
}
// A new link opened in the same tab only changes the #fragment, so re-check on every change.
onMounted(() => { load(); window.addEventListener('hashchange', load) })
onBeforeUnmount(() => window.removeEventListener('hashchange', load))

const wrongAccount = computed(() => !!account.value && !!info.value?.from && account.value.toLowerCase() !== info.value.from.toLowerCase())
const canSign = computed(() =>
  !!info.value?.ok && !info.value.expired && !!info.value.simulation?.ok && !!account.value && chainOk.value
  && !wrongAccount.value && (!info.value.involvesStockToken || eligible.value) && !running.value && !finished.value)

async function waitForReceipt(hash: string) {
  const eth = window.ethereum!
  for (let i = 0; i < 120; i++) {
    const r = await eth.request({ method: 'eth_getTransactionReceipt', params: [hash] }).catch(() => null)
    if (r) return r as { status: string }
    await new Promise(res => setTimeout(res, 1500))
  }
  throw new Error('Timed out waiting for confirmation.')
}

async function signAll() {
  if (!canSign.value || !info.value?.transactions) return
  running.value = true
  const eth = window.ethereum!
  try {
    for (const [i, tx] of info.value.transactions.entries()) {
      if (states.value[i] === 'done') continue
      states.value[i] = 'wallet'
      const hash = await eth.request({
        method: 'eth_sendTransaction',
        params: [{ from: account.value, to: tx.to, data: tx.data, value: `0x${BigInt(tx.value).toString(16)}` }]
      }) as string
      hashes.value[i] = hash
      states.value[i] = 'pending'
      const receipt = await waitForReceipt(hash)
      if (receipt.status !== '0x1') { states.value[i] = 'failed'; throw new Error('Transaction reverted on-chain.') }
      states.value[i] = 'done'
    }
    finished.value = true
    toast.add({ title: 'All done', description: `Every transaction is confirmed on ${chainName.value}.`, icon: 'i-lucide-circle-check', color: 'success' })
  } catch (err: any) {
    const i = states.value.findIndex(s => s === 'wallet' || s === 'pending')
    if (i >= 0) states.value[i] = err?.code === 4001 ? 'idle' : 'failed'
    toast.add({ title: err?.code === 4001 ? 'Cancelled in wallet' : 'Transaction failed', description: err?.code === 4001 ? undefined : String(err?.message || err).slice(0, 140), color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    running.value = false
  }
}

const stateIcon: Record<StepState, string> = { idle: 'i-lucide-circle', wallet: 'i-lucide-wallet', pending: 'i-lucide-loader-circle', done: 'i-lucide-circle-check', failed: 'i-lucide-circle-x' }
const stateText: Record<StepState, string> = { idle: '', wallet: 'Confirm in your wallet…', pending: 'Waiting for confirmation…', done: 'Confirmed', failed: 'Failed' }
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <div class="absolute inset-0 -z-10">
      <div class="bg-grid absolute inset-0" />
      <div class="aurora left-[-10%] top-[-20%] h-[480px] w-[480px] bg-teal-500/30" />
      <div class="aurora right-[-10%] top-[30%] h-[420px] w-[420px] bg-emerald-400/20 [animation-delay:-8s]" />
    </div>

    <header class="mx-auto flex h-20 max-w-3xl items-center justify-between px-5">
      <NuxtLink to="/" class="flex items-center gap-2.5 font-display text-lg font-bold text-highlighted"><BrandMark :size="28" />ROUTIQ</NuxtLink>
      <UButton
        :label="account ? short : 'Connect wallet'"
        :leading-icon="account ? (chainOk ? 'i-lucide-circle-check' : 'i-lucide-triangle-alert') : 'i-lucide-wallet'"
        :color="account ? 'neutral' : 'primary'" :variant="account ? 'subtle' : 'solid'"
        :class="account ? 'font-mono' : 'bg-brand-gradient text-[#04201C]'"
        @click="connect(linkChain)"
      />
    </header>

    <main class="mx-auto max-w-3xl px-5 pb-24 pt-6">
      <span class="font-mono text-xs uppercase tracking-[.16em] text-teal-300">Review &amp; sign</span>
      <h1 class="mt-3 font-display text-4xl font-semibold tracking-tight text-highlighted sm:text-5xl">Check before you sign.</h1>
      <p class="mt-3 max-w-xl text-muted">Your agent prepared this with ROUTIQ. Nothing happens until you approve it in your own wallet — ROUTIQ never holds your keys.</p>

      <!-- no link -->
      <div v-if="!loading && !payload" class="glass mt-10 rounded-3xl p-8 text-center text-muted">
        <UIcon name="i-lucide-link-2-off" class="mx-auto size-8 text-dimmed" />
        <p class="mt-3">Open this page from a sign link your agent gives you.</p>
        <UButton label="Back to ROUTIQ" to="/" variant="link" class="mt-2" />
      </div>

      <!-- loading -->
      <div v-else-if="loading" class="glass mt-10 flex items-center gap-3 rounded-3xl p-8 text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-teal-300" />Decoding and simulating on-chain…
      </div>

      <!-- rejected link -->
      <div v-else-if="info && !info.ok" class="mt-10 rounded-3xl border border-red-500/40 bg-red-500/10 p-8">
        <div class="flex items-center gap-3 text-red-300"><UIcon name="i-lucide-shield-x" class="size-6" /><h2 class="font-display text-xl font-semibold">Do not sign this</h2></div>
        <p class="mt-3 text-red-200/90">{{ info.error }}</p>
        <p class="mt-2 text-sm text-red-200/70">ROUTIQ only signs exact approvals, short-lived Permit2 allowances, transfers and Uniswap v3/v4 swaps it can fully decode. This link is outside that list.</p>
      </div>

      <!-- review -->
      <div v-else-if="info" class="mt-10 space-y-4">
        <div class="glass rounded-3xl p-6 sm:p-8">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <span class="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
              <UIcon name="i-lucide-shield-check" class="size-3.5" />Decoded by ROUTIQ · known contracts only
            </span>
            <span class="font-mono text-xs text-dimmed">from {{ info.from }}</span>
          </div>

          <ol class="mt-6 space-y-3">
            <li v-for="(s, i) in info.steps" :key="i" class="flex gap-4 rounded-2xl border border-default bg-black/20 p-4">
              <span class="grid size-8 shrink-0 place-items-center rounded-xl bg-white/5 font-mono text-sm text-teal-200">{{ i + 1 }}</span>
              <div class="min-w-0 flex-1">
                <div class="font-medium text-highlighted">{{ s.title }}</div>
                <div class="mt-0.5 break-all text-sm text-muted">{{ s.detail }}</div>
                <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span v-if="info.simulation?.steps[i]?.ok" class="inline-flex items-center gap-1 text-emerald-300"><UIcon name="i-lucide-flask-conical" class="size-3.5" />Simulation passed</span>
                  <span v-else class="inline-flex items-center gap-1 text-red-300"><UIcon name="i-lucide-flask-conical" class="size-3.5" />Simulation failed{{ info.simulation?.steps[i]?.error ? `: ${info.simulation.steps[i]!.error}` : '' }}</span>
                  <span v-if="states[i] !== 'idle'" :class="['inline-flex items-center gap-1', states[i] === 'done' ? 'text-emerald-300' : states[i] === 'failed' ? 'text-red-300' : 'text-teal-300']">
                    <UIcon :name="stateIcon[states[i]!]" :class="['size-3.5', states[i] === 'pending' && 'animate-spin']" />{{ stateText[states[i]!] }}
                  </span>
                  <a v-if="hashes[i] && txUrl(hashes[i]!)" :href="txUrl(hashes[i]!)!" target="_blank" rel="noopener" class="font-mono text-teal-200 hover:text-teal-300">{{ hashes[i]!.slice(0, 10) }}… ↗</a>
                  <span v-else-if="hashes[i]" class="font-mono text-teal-200" :title="hashes[i]!">{{ hashes[i]!.slice(0, 10) }}…</span>
                </div>
              </div>
            </li>
          </ol>

          <div class="mt-5 flex flex-wrap justify-between gap-2 border-t border-default pt-4 text-sm">
            <span class="text-muted">Estimated network fee</span>
            <span class="font-mono text-highlighted">{{ info.estimatedNetworkFee ?? '—' }}</span>
          </div>
        </div>

        <!-- warnings -->
        <div v-if="info.expired" class="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          <UIcon name="i-lucide-clock-alert" class="mt-0.5 size-4 shrink-0" />This link has expired. Ask your agent for a fresh one — prices may have moved.
        </div>
        <div v-if="info.simulation && !info.simulation.ok" class="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <UIcon name="i-lucide-circle-alert" class="mt-0.5 size-4 shrink-0" />The simulation failed, so signing is disabled. Check your balance, or ask your agent to rebuild it.
          <UButton label="Re-check" size="xs" variant="outline" color="neutral" class="ml-auto" @click="inspect" />
        </div>
        <div v-if="wrongAccount" class="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          <UIcon name="i-lucide-user-x" class="mt-0.5 size-4 shrink-0" />Your connected wallet is {{ short }}, but this was prepared for {{ info.from }}. Switch accounts in your wallet.
        </div>
        <div v-if="account && !chainOk" class="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          <UIcon name="i-lucide-network" class="size-4 shrink-0" />Your wallet is on another network — this link is for {{ chainName }}.
          <UButton :label="`Switch to ${chainName}`" size="xs" class="ml-auto bg-brand-gradient text-[#04201C]" @click="addNetwork(linkChain)" />
        </div>

        <label v-if="info.involvesStockToken" class="glass flex cursor-pointer items-start gap-3 rounded-2xl p-4 text-sm text-toned">
          <UCheckbox v-model="eligible" class="mt-0.5" />
          <span>I confirm I am eligible to hold Robinhood stock tokens where I live, and I am not a US person. Stock tokens are not available everywhere.</span>
        </label>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <UButton
            v-if="!account" label="Connect wallet to sign" icon="i-lucide-wallet" size="xl" block
            class="bg-brand-gradient text-[#04201C] sm:w-auto" @click="connect(linkChain)"
          />
          <UButton
            v-else :label="finished ? 'Done' : running ? 'Signing…' : `Sign ${info.transactions?.length ?? 0} transaction${(info.transactions?.length ?? 0) > 1 ? 's' : ''}`"
            :icon="finished ? 'i-lucide-circle-check' : 'i-lucide-pen-line'" size="xl" block :loading="running" :disabled="!canSign"
            class="bg-brand-gradient text-[#04201C] sm:w-auto" @click="signAll"
          />
          <span class="text-xs text-dimmed">Your wallet will show each transaction again before it is sent.</span>
        </div>
      </div>
    </main>
  </div>
</template>
