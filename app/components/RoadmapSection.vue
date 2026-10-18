<script setup lang="ts">
const phases = [
  { when: 'Now', title: 'Foundation', items: ['Website & tool catalog preview', 'Wallet + network setup', 'chain.status tool live'], now: true },
  { when: 'Phase 2', title: 'Early access', items: ['Skill + remote MCP server', 'First trading & market tools', 'USDG balance contract'] },
  { when: 'Phase 3', title: 'Open catalog', items: ['Full tool catalog', 'Provider onboarding & payouts', 'routiq CLI'] },
  { when: 'Phase 4', title: 'Agentic trading', items: ['Spending policies per agent', 'Multi-step trade flows', 'SDK for wallets & dApps'] }
]
</script>

<template>
  <section id="roadmap" class="border-y border-default bg-[var(--ui-bg-muted)] py-24 sm:py-32">
    <UContainer>
      <SectionHeading eyebrow="Roadmap">Where ROUTIQ is going.</SectionHeading>
      <div v-reveal class="relative grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:pt-10">
        <div class="absolute inset-x-0 top-[11px] hidden h-0.5 overflow-hidden rounded bg-white/[.07] lg:block"><div class="h-full w-[16%] bg-brand-gradient" /></div>
        <article
          v-for="p in phases" :key="p.when"
          :class="['glass relative rounded-3xl p-6', p.now && 'border-violet-400/40 shadow-[0_0_60px_-24px_rgba(124,92,255,.9)]']"
        >
          <span :class="['absolute -top-[39px] left-6 hidden size-4 rounded-full border-2 lg:block', p.now ? 'border-violet-400 bg-violet-500 shadow-[0_0_0_6px_rgba(124,92,255,.2)]' : 'border-white/20 bg-[var(--ui-bg-muted)]']" />
          <span :class="['font-mono text-xs uppercase tracking-widest', p.now ? 'text-cyan-300' : 'text-dimmed']">{{ p.when }}</span>
          <h3 class="mt-2 font-display text-xl font-semibold text-highlighted">{{ p.title }}</h3>
          <ul class="mt-4 space-y-2 text-sm text-toned">
            <li v-for="it in p.items" :key="it" class="flex gap-2"><UIcon :name="p.now ? 'i-lucide-circle-check' : 'i-lucide-circle-dashed'" :class="['mt-0.5 size-4 shrink-0', p.now ? 'text-emerald-400' : 'text-dimmed']" />{{ it }}</li>
          </ul>
        </article>
      </div>
    </UContainer>
  </section>
</template>
