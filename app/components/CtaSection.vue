<script setup lang="ts">
const { label, connect, busy } = useWallet()
const skillUrl = useSkillUrl()
const copy = useCopy()
const site = SITE
</script>

<template>
  <section class="pb-24 sm:pb-32">
    <UContainer>
      <div v-reveal class="relative isolate overflow-hidden rounded-[36px] border border-teal-300/30 bg-[#06201B] px-6 py-20 text-center sm:px-12 sm:py-28">
        <div class="absolute inset-[-40%] -z-10 animate-[drift_18s_ease-in-out_infinite_alternate] bg-[radial-gradient(30%_40%_at_30%_40%,rgba(80,210,193,.55),transparent_70%),radial-gradient(30%_40%_at_70%_60%,rgba(151,252,228,.35),transparent_70%),radial-gradient(25%_30%_at_50%_15%,rgba(47,179,163,.35),transparent_70%)] blur-md" />
        <div class="bg-grid absolute inset-0 -z-10 opacity-50" />
        <h2 class="mx-auto max-w-3xl font-display text-4xl font-semibold leading-[1.04] tracking-tight text-white sm:text-6xl">Give your agent every on-chain tool.</h2>
        <p class="mx-auto mt-5 max-w-xl text-lg text-white/75">Use the live Elysium and Robinhood Chain tools today, and be first in line when $ROUTIQ launches on Elysium.</p>
        <div class="mt-10 flex flex-wrap justify-center gap-3">
          <UButton :label="`Copy install command`" icon="i-lucide-copy" size="xl" class="bg-white text-[#08110F] hover:bg-white/90" @click="copy(`set up ${skillUrl}`, 'Install command copied')" />
          <UButton :label="label" :loading="busy" icon="i-lucide-wallet" size="xl" color="neutral" variant="outline" class="bg-white/5 text-white" @click="connect()" />
        </div>
        <div class="mx-auto mt-10 flex max-w-lg items-center gap-3 rounded-full border border-white/15 bg-black/35 py-2 pl-5 pr-2 text-left font-mono text-xs">
          <span class="shrink-0 font-medium text-teal-300">$ROUTIQ</span>
          <span class="min-w-0 flex-1 truncate text-white/60">{{ site.tokenAddress || 'Contract address announced at launch on Elysium' }}</span>
          <UButton v-if="site.tokenAddress" label="Copy" size="xs" class="bg-white text-[#08110F]" @click="copy(site.tokenAddress, 'Contract address copied')" />
          <UIcon v-else name="i-lucide-shield-alert" class="mr-2 size-4 shrink-0 text-amber-300" />
        </div>
      </div>
    </UContainer>
  </section>
</template>
