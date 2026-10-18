<script setup lang="ts">
const steps = [
  { icon: 'i-lucide-search', title: 'Discover', code: 'routiq.discover("…")', text: 'Your agent describes the job. ROUTIQ ranks matching tools by fit and price.' },
  { icon: 'i-lucide-play', title: 'Run', code: 'routiq.run(tool, args)', text: 'The agent calls the tool right away. No sign-ups, no API keys per provider.' },
  { icon: 'i-lucide-receipt', title: 'Pay per call', code: '−$0.002 USDG', text: 'Each call is debited from one on-chain balance. Nothing to subscribe to.' }
]
</script>

<template>
  <section id="how" class="relative border-y border-default bg-[var(--ui-bg-muted)] py-24 sm:py-32">
    <UContainer>
      <SectionHeading eyebrow="How it works" center>
        Tell your agent what to do. <span class="text-gradient">It picks the tools.</span>
      </SectionHeading>

      <div class="relative grid grid-cols-1 gap-5 md:grid-cols-3">
        <div class="beam-line pointer-events-none absolute left-[16%] right-[16%] top-[52px] hidden h-px md:block" aria-hidden="true" />
        <div v-for="(s, i) in steps" :key="s.title" v-reveal="i * 110" v-spotlight class="glass relative rounded-3xl p-7 text-center">
          <div class="relative mx-auto grid size-[72px] place-items-center rounded-2xl border border-default bg-[#0E0E18]">
            <div class="absolute inset-0 rounded-2xl bg-brand-gradient opacity-20 blur-xl" />
            <UIcon :name="s.icon" class="relative size-7 text-cyan-300" />
            <span class="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-brand-gradient font-mono text-[11px] text-white">{{ i + 1 }}</span>
          </div>
          <h3 class="mt-6 font-display text-2xl font-semibold text-highlighted">{{ s.title }}</h3>
          <code class="mt-3 inline-block rounded-lg border border-default bg-black/30 px-3 py-1.5 font-mono text-[13px] text-violet-300">{{ s.code }}</code>
          <p class="mx-auto mt-4 max-w-xs text-muted">{{ s.text }}</p>
        </div>
      </div>
    </UContainer>
  </section>
</template>
