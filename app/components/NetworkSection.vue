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
        Built on Robinhood Chain. <span class="text-gradient">Watching it live.</span>
        <template #sub>These numbers come straight from the chain’s public RPC — the same data the <code class="font-mono text-violet-300">chain.status</code> tool returns.</template>
      </SectionHeading>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-[auto_auto_auto]">
        <article v-reveal v-spotlight class="glass flex flex-col rounded-3xl p-7 md:col-span-2 md:row-span-2">
          <div class="flex flex-wrap items-center gap-2 font-mono text-xs text-dimmed">
            <span :class="['size-2 rounded-full', state.status === 'live' ? 'pulse-dot bg-emerald-400' : 'bg-white/30']" />
            Latest block · {{ state.status === 'live' ? 'live' : state.status === 'down' ? 'RPC unavailable, retrying' : 'connecting…' }}
          </div>
          <div class="mt-4 font-display text-5xl font-semibold tracking-tight text-gradient tabular-nums sm:text-7xl">{{ blockText }}</div>
          <svg class="mb-4 mt-auto h-24 w-full pt-6" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="spark-g" gradientUnits="userSpaceOnUse" x1="0" x2="300" y1="0" y2="0"><stop offset="0" stop-color="#7C5CFF" /><stop offset="1" stop-color="#38D9F5" /></linearGradient></defs>
            <path :d="spark.fill" fill="rgb(124 92 255 / .12)" />
            <path :d="spark.line" fill="none" stroke="url(#spark-g)" stroke-width="2" vector-effect="non-scaling-stroke" />
            <line v-if="!spark.line" x1="0" x2="300" y1="60" y2="60" stroke="rgb(255 255 255 / .08)" stroke-dasharray="4 6" vector-effect="non-scaling-stroke" />
          </svg>
          <div class="flex justify-between border-t border-default pt-3 text-sm"><span class="text-muted">Measured block time</span><b class="font-mono font-medium text-highlighted">{{ state.blockTimeMs ? `≈ ${Math.round(state.blockTimeMs)} ms` : '—' }}</b></div>
          <div class="mt-3 flex justify-between border-t border-default pt-3 text-sm"><span class="text-muted">Blocks seen this visit</span><b class="font-mono font-medium text-highlighted">{{ state.seen.toLocaleString('en-US') }}</b></div>
        </article>

        <article v-reveal="80" v-spotlight class="glass rounded-3xl p-7">
          <div class="font-mono text-xs text-dimmed">Gas price</div>
          <div class="mt-3 font-display text-4xl font-semibold text-highlighted tabular-nums">{{ fmtGwei(gasGwei) }}<small class="ml-1 text-base text-muted">gwei</small></div>
          <p class="mt-2 text-sm text-muted">Paid in ETH.</p>
        </article>

        <article v-reveal="140" v-spotlight class="glass flex flex-col items-start rounded-3xl p-7">
          <div class="font-mono text-xs text-dimmed">Chain ID</div>
          <div class="mt-3 font-display text-4xl font-semibold text-highlighted">4663</div>
          <UButton label="Add to wallet" icon="i-lucide-plus" size="sm" color="primary" variant="soft" class="mt-auto pt-1.5" @click="addNetwork" />
        </article>

        <article v-reveal="200" v-spotlight class="glass flex items-center gap-6 rounded-3xl p-7 md:col-span-2">
          <svg viewBox="0 0 120 120" class="size-24 shrink-0 -rotate-90" aria-hidden="true">
            <defs><linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C5CFF" /><stop offset="1" stop-color="#38D9F5" /></linearGradient></defs>
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

        <article v-reveal="260" v-spotlight class="glass flex flex-wrap items-center justify-between gap-5 rounded-3xl p-7 md:col-span-4">
          <div>
            <div class="font-mono text-xs text-dimmed">Architecture</div>
            <p class="mt-2 text-lg text-highlighted">Ethereum Layer 2 on <b class="text-violet-300">Arbitrum Orbit</b>. Fast blocks, low fees, settled on Ethereum.</p>
          </div>
          <UButton label="Open explorer" trailing-icon="i-lucide-arrow-up-right" color="neutral" variant="outline" to="https://robinhoodchain.blockscout.com" target="_blank" />
        </article>
      </div>
    </UContainer>
  </section>
</template>
