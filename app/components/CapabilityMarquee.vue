<script setup lang="ts">
const items = [
  { icon: 'i-lucide-route', text: 'Quote the best route' },
  { icon: 'i-lucide-trending-up', text: 'Check TSLA premium' },
  { icon: 'i-lucide-key-round', text: 'Audit token approvals' },
  { icon: 'i-lucide-git-merge', text: 'Bridge in from Ethereum' },
  { icon: 'i-lucide-landmark', text: 'Compare USDG yield' },
  { icon: 'i-lucide-badge-check', text: 'Verify a stock token' },
  { icon: 'i-lucide-flask-conical', text: 'Simulate before signing' },
  { icon: 'i-lucide-history', text: 'Explain a wallet’s history' }
]
</script>

<template>
  <div class="border-y border-default bg-[var(--ui-bg-muted)] py-5">
    <UMarquee pause-on-hover :ui="{ root: '[--duration:45s] [--gap:--spacing(3)]' }">
      <span v-for="i in items" :key="i.text" class="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-default bg-white/[.03] px-4 py-2 text-sm text-toned">
        <UIcon :name="i.icon" class="size-4 text-cyan-300" />{{ i.text }}
      </span>
    </UMarquee>
  </div>
</template>
