<script setup lang="ts">
const { state } = useChain()
</script>

<template>
  <section id="top" class="relative isolate overflow-hidden pb-20 pt-32 sm:pt-40 lg:pb-28">
    <!-- background layers -->
    <div class="absolute inset-0 -z-10">
      <div class="bg-grid absolute inset-0" />
      <div class="aurora left-[-10%] top-[-10%] h-[520px] w-[520px] bg-violet-600/40" />
      <div class="aurora right-[-8%] top-[10%] h-[460px] w-[460px] bg-cyan-500/25 [animation-delay:-8s]" />
      <NetCanvas class="opacity-70" />
      <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--ui-bg)]" />
    </div>

    <UContainer class="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
      <div>
        <a href="#network" class="glass inline-flex max-w-full items-center gap-2.5 rounded-full px-3.5 py-1.5 font-mono text-xs text-toned transition hover:border-accented">
          <span :class="['size-2 shrink-0 rounded-full', state.status === 'live' ? 'pulse-dot bg-emerald-400' : 'bg-white/30']" />
          <span class="truncate">Robinhood Chain · block <b class="font-medium text-highlighted tabular-nums">{{ state.block ? state.block.toLocaleString('en-US') : (state.status === 'down' ? '—' : '…') }}</b></span>
        </a>

        <h1 class="mt-7 font-display text-[44px] font-semibold leading-[1] tracking-[-.035em] text-highlighted sm:text-6xl lg:text-[76px]">
          Every <span class="text-gradient">on-chain tool</span> your agent needs.
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-relaxed text-toned">
          One skill connects your AI agent to stock-token prices, swaps, wallets and DeFi on Robinhood Chain.
          It discovers, compares and pays per call — from one USDG balance.
        </p>

        <div class="mt-9"><InstallBox /></div>

        <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
          <span class="inline-flex items-center gap-2"><UIcon name="i-lucide-key-round" class="size-4 text-violet-300" />No API keys</span>
          <span class="inline-flex items-center gap-2"><UIcon name="i-lucide-receipt" class="size-4 text-violet-300" />Pay per call</span>
          <span class="inline-flex items-center gap-2"><UIcon name="i-lucide-pen-line" class="size-4 text-violet-300" />You sign every trade</span>
        </div>
      </div>

      <AgentConsole class="w-full max-w-xl justify-self-center lg:justify-self-end" />
    </UContainer>
  </section>
</template>
