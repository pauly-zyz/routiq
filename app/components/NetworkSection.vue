<script setup lang="ts">
const { state, gasGwei } = useChain()
const { addNetwork } = useWallet()
const fmtGwei = formatGwei

const spark = computed(() => {
  const s = state.value.series
  if (s.length < 2) return { line: '', fill: '' }
  const max = Math.max(...s), min = Math.min(...s), span = max - min || 1
  const pts = s.map((v, i) => [(i / (s.length - 1)) * 300, 62 - ((v - min) / span) * 50] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  return { line, fill: `${line} L300 70 L0 70 Z` }
})

// US exchange regular session (9:30–16:00 New York, Mon–Fri). Holidays are not included.
const now = ref<Date | null>(null)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { now.value = new Date(); timer = setInterval(() => { now.value = new Date() }, 30000) })
onBeforeUnmount(() => clearInterval(timer))
const market = computed(() => {
  if (!now.value) return null
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(now.value).map(x => [x.type, x.value]))
  const mins = Number(p.hour) * 60 + Number(p.minute)
  const open = !['Sat', 'Sun'].includes(p.weekday!) && mins >= 570 && mins < 960
  return { open, angle: (mins / 1440) * 360 }
})
const C = 2 * Math.PI * 50
const blockText = computed(() => state.value.block ? state.value.block.toLocaleString('en-US') : state.value.status === 'down' ? '—' : '…')
</script>

<template>
  <section id="network" class="relative border-y border-default bg-[var(--ui-bg-muted)] py-24 sm:py-32">
    <UContainer>
      <SectionHeading eyebrow="Network">
        Live on Elysium. <span class="text-gradient">And on Robinhood Chain.</span>
        <template #sub>ROUTIQ launches on Elysium, Hyperliquid’s Layer 2 — and every MCP tool already runs there: HYPE and USDC swaps, wallets, approvals. Robinhood Chain stays supported for stock tokens. The live numbers below are the same data the <code class="font-mono text-teal-200">chain_status</code> tool returns.</template>
      </SectionHeading>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-[auto_auto_auto]">
        <article v-reveal v-spotlight class="border-beam glass relative flex flex-col gap-6 overflow-hidden rounded-3xl p-7 md:col-span-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-teal-500/20 blur-3xl" />
          <div class="max-w-2xl">
            <div class="flex items-center gap-2 font-mono text-xs uppercase tracking-[.16em] text-teal-300"><span class="pulse-dot size-2 rounded-full bg-emerald-400" />Launch chain</div>
            <h3 class="mt-3 font-display text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">Elysium</h3>
            <p class="mt-2 text-toned">Hyperliquid’s Layer 2 by Kinetiq — an Arbitrum Orbit chain with fast blocks, settling to HyperEVM. ROUTIQ and the $ROUTIQ token launch here, and all 13 tools already work here.</p>
            <UButton label="Add Elysium to wallet" icon="i-lucide-plus" size="sm" color="primary" variant="soft" class="mt-4" @click="addNetwork('elysium')" />
          </div>
          <dl class="grid shrink-0 grid-cols-3 gap-3 text-center">
            <div class="rounded-2xl border border-default bg-black/20 px-4 py-3"><dt class="font-mono text-[11px] text-dimmed">Chain ID</dt><dd class="mt-1 font-display text-xl font-semibold text-highlighted">99901</dd></div>
            <div class="rounded-2xl border border-default bg-black/20 px-4 py-3"><dt class="font-mono text-[11px] text-dimmed">Gas</dt><dd class="mt-1 font-display text-xl font-semibold text-highlighted">HYPE</dd></div>
            <div class="rounded-2xl border border-default bg-black/20 px-4 py-3"><dt class="font-mono text-[11px] text-dimmed">Mainnet</dt><dd class="mt-1 font-display text-xl font-semibold text-highlighted">Nov 9</dd></div>
          </dl>
        </article>
        <article v-reveal v-spotlight class="glass flex flex-col rounded-3xl p-7 md:col-span-2 md:row-span-2">
          <div class="flex flex-wrap items-center gap-2 font-mono text-xs text-dimmed">
            <span :class="['size-2 rounded-full', state.status === 'live' ? 'pulse-dot bg-emerald-400' : 'bg-white/30']" />
            Elysium · latest block · {{ state.status === 'live' ? 'live' : state.status === 'down' ? 'RPC unavailable, retrying' : 'connecting…' }}
          </div>
          <div class="mt-4 font-display text-5xl font-semibold tracking-tight text-gradient tabular-nums sm:text-7xl">{{ blockText }}</div>
          <svg class="mb-4 mt-auto h-24 w-full pt-6" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="spark-g" gradientUnits="userSpaceOnUse" x1="0" x2="300" y1="0" y2="0"><stop offset="0" stop-color="#50D2C1" /><stop offset="1" stop-color="#97FCE4" /></linearGradient></defs>
            <path :d="spark.fill" fill="rgb(80 210 193 / .12)" />
            <path :d="spark.line" fill="none" stroke="url(#spark-g)" stroke-width="2" vector-effect="non-scaling-stroke" />
            <line v-if="!spark.line" x1="0" x2="300" y1="60" y2="60" stroke="rgb(255 255 255 / .08)" stroke-dasharray="4 6" vector-effect="non-scaling-stroke" />
          </svg>
          <div class="flex justify-between border-t border-default pt-3 text-sm"><span class="text-muted">Measured block time</span><b class="font-mono font-medium text-highlighted">{{ state.blockTimeMs ? `≈ ${Math.round(state.blockTimeMs)} ms` : '—' }}</b></div>
          <div class="mt-3 flex justify-between border-t border-default pt-3 text-sm"><span class="text-muted">Blocks seen this visit</span><b class="font-mono font-medium text-highlighted">{{ state.seen.toLocaleString('en-US') }}</b></div>
        </article>

        <article v-reveal="80" v-spotlight class="glass rounded-3xl p-7">
          <div class="font-mono text-xs text-dimmed">Gas price</div>
          <div class="mt-3 font-display text-4xl font-semibold text-highlighted tabular-nums">{{ fmtGwei(gasGwei) }}<small class="ml-1 text-base text-muted">gwei</small></div>
          <p class="mt-2 text-sm text-muted">Paid in HYPE on Elysium.</p>
        </article>

        <article v-reveal="140" v-spotlight class="glass flex flex-col items-start rounded-3xl p-7">
          <div class="font-mono text-xs text-dimmed">Robinhood Chain ID</div>
          <div class="mt-3 font-display text-4xl font-semibold text-highlighted">4663</div>
          <UButton label="Add to wallet" icon="i-lucide-plus" size="sm" color="primary" variant="soft" class="mt-auto pt-1.5" @click="addNetwork('robinhood')" />
        </article>

        <article v-reveal="200" v-spotlight class="glass flex items-center gap-6 rounded-3xl p-7 md:col-span-2">
          <svg viewBox="0 0 120 120" class="size-24 shrink-0 -rotate-90" aria-hidden="true">
            <defs><linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#50D2C1" /><stop offset="1" stop-color="#97FCE4" /></linearGradient></defs>
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgb(255 255 255 / .07)" stroke-width="10" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="url(#ring-g)" stroke-width="10" stroke-linecap="round" :stroke-dasharray="`${C * 6.5 / 24} ${C}`" :stroke-dashoffset="-C * 9.5 / 24" />
            <line v-if="market" x1="60" y1="60" x2="100" y2="60" stroke="#fff" stroke-width="2.5" stroke-linecap="round" :style="{ transformOrigin: '60px 60px', transform: `rotate(${market.angle}deg)` }" />
            <circle cx="60" cy="60" r="4" fill="#fff" />
          </svg>
          <div>
            <div class="font-mono text-xs text-dimmed">US exchange · regular hours</div>
            <div :class="['mt-1.5 font-display text-2xl font-semibold', market?.open ? 'text-emerald-400' : 'text-amber-300']">
              {{ market ? (market.open ? 'Exchange open' : 'Exchange closed') : '…' }}
            </div>
            <p class="mt-1.5 text-sm text-muted">Stock tokens on Robinhood Chain trade 24/7 — your agent can act even when the exchange is closed.</p>
          </div>
        </article>

      </div>
    </UContainer>
  </section>
</template>
