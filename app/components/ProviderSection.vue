<script setup lang="ts">
const openLink = useExternalLink()
const steps = [
  { icon: 'i-lucide-upload', title: 'List your tool', text: 'Describe your endpoint or contract and what it returns.' },
  { icon: 'i-lucide-tag', title: 'Set a price', text: 'Choose a per-call price in USDG. Agents see it before they call.' },
  { icon: 'i-lucide-coins', title: 'Get paid per call', text: 'Earnings settle on Robinhood Chain as agents use your tool.' }
]
</script>

<template>
  <section class="pb-24 sm:pb-32">
    <UContainer>
      <div v-reveal class="relative overflow-hidden rounded-[32px] border border-default bg-gradient-to-br from-[#121026] via-[#0D0D18] to-[#08131A] p-8 sm:p-14">
        <div class="bg-grid absolute inset-0 opacity-60" />
        <div class="relative grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <span class="font-mono text-xs uppercase tracking-[.16em] text-cyan-300">For tool providers</span>
            <h2 class="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight text-highlighted sm:text-5xl">Sell your tool to <span class="text-gradient">every agent</span> on the chain.</h2>
            <p class="mt-4 text-muted">Run a DEX, an oracle, a data API or a vault? List it once and every ROUTIQ agent can find it and pay for it.</p>
            <UButton label="Become a provider" trailing-icon="i-lucide-arrow-right" size="lg" class="mt-8 bg-brand-gradient text-white" @click="openLink('github')" />
          </div>
          <ol class="grid gap-3">
            <li v-for="(s, i) in steps" :key="s.title" v-reveal="i * 100" class="glass flex items-start gap-4 rounded-2xl p-5">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 font-mono text-sm text-violet-300">0{{ i + 1 }}</span>
              <div><h3 class="flex items-center gap-2 font-medium text-highlighted"><UIcon :name="s.icon" class="size-4 text-cyan-300" />{{ s.title }}</h3><p class="mt-1 text-sm text-muted">{{ s.text }}</p></div>
            </li>
          </ol>
        </div>
      </div>
    </UContainer>
  </section>
</template>
