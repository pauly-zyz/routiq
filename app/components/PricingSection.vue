<script setup lang="ts">
import { TOOLS } from '~/data/tools'

const calls = [
  { tool: 'route.quote', when: '2s ago', cost: 0.002 },
  { tool: 'stock.premium', when: '41s ago', cost: 0.002 },
  { tool: 'wallet.portfolio', when: '3m ago', cost: 0.001 },
  { tool: 'swap.build', when: '3m ago', cost: 0.004 },
  { tool: 'chain.status', when: '7m ago', cost: 0 }
]
const points = [
  { icon: 'i-lucide-ban', title: 'No subscriptions', text: 'Pay only for the calls your agent makes.' },
  { icon: 'i-lucide-key-round', title: 'No API keys', text: 'One balance replaces a key for every provider.' },
  { icon: 'i-lucide-gauge', title: 'Spending caps', text: 'Set a daily limit per agent. It cannot spend past it.' },
  { icon: 'i-lucide-pen-line', title: 'You sign trades', text: 'Tools that move funds return a transaction for your wallet to sign.' }
]
const stats = [
  { value: String(TOOLS.length), label: 'tools planned at launch' },
  { value: '$0.001', label: 'planned starting price per call' },
  { value: '0', label: 'subscriptions to manage' }
]
</script>

<template>
  <section id="pricing" class="relative overflow-hidden py-24 sm:py-32">
    <div class="aurora -right-40 top-20 h-[420px] w-[420px] bg-violet-700/25" />
    <UContainer class="relative">
      <div class="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Pricing">
            We killed the subscriptions. <span class="text-gradient">One balance for every tool.</span>
          </SectionHeading>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-for="(p, i) in points" :key="p.title" v-reveal="i * 80" class="flex gap-3.5">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl border border-default bg-white/[.03]"><UIcon :name="p.icon" class="size-5 text-violet-300" /></span>
              <div><h3 class="font-medium text-highlighted">{{ p.title }}</h3><p class="mt-1 text-sm text-muted">{{ p.text }}</p></div>
            </div>
          </div>
        </div>

        <!-- balance card mock -->
        <div v-reveal="120" v-spotlight class="border-beam glass rounded-[28px] p-6 sm:p-8">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs uppercase tracking-widest text-dimmed">Agent balance</span>
            <UBadge label="preview" color="warning" variant="subtle" size="sm" />
          </div>
          <div class="mt-3 flex items-end gap-2">
            <span class="font-display text-5xl font-semibold tracking-tight text-highlighted tabular-nums">24.991</span>
            <span class="mb-1.5 text-muted">USDG</span>
          </div>
          <div class="mt-5">
            <div class="mb-1.5 flex justify-between text-xs text-dimmed"><span>Daily cap</span><span class="font-mono">$0.009 / $2.00</span></div>
            <div class="h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div class="h-full w-[4%] rounded-full bg-brand-gradient" /></div>
          </div>
          <ul class="mt-6 divide-y divide-[var(--ui-border)] rounded-2xl border border-default bg-black/20">
            <li v-for="c in calls" :key="c.tool + c.when" class="flex items-center gap-3 px-4 py-3 text-sm">
              <UIcon name="i-lucide-zap" class="size-4 text-cyan-300" />
              <span class="font-mono text-toned">{{ c.tool }}</span>
              <span class="ml-auto text-xs text-dimmed">{{ c.when }}</span>
              <span class="w-16 text-right font-mono text-xs text-highlighted">{{ c.cost ? `−$${c.cost.toFixed(3)}` : 'free' }}</span>
            </li>
          </ul>
          <UButton label="Top up with USDG" icon="i-lucide-plus" block size="lg" class="mt-6" color="neutral" variant="subtle" disabled />
          <p class="mt-2 text-center text-xs text-dimmed">Balance contract launches with early access.</p>
        </div>
      </div>

      <div class="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div v-for="(s, i) in stats" :key="s.label" v-reveal="i * 90" class="glass rounded-3xl p-7 text-center">
          <div class="font-display text-5xl font-semibold tracking-tight text-gradient">{{ s.value }}</div>
          <div class="mt-2 text-sm text-muted">{{ s.label }}</div>
        </div>
      </div>
    </UContainer>
  </section>
</template>
