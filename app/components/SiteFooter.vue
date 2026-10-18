<script setup lang="ts">
const { addNetwork } = useWallet()
const openLink = useExternalLink()
</script>

<template>
  <footer class="overflow-hidden border-t border-default pt-20">
    <UContainer class="flex flex-col justify-between gap-12 md:flex-row">
      <div class="max-w-xs">
        <a href="#top" class="flex items-center gap-2.5 font-display text-lg font-bold text-highlighted"><BrandMark :size="28" />ROUTIQ</a>
        <p class="mt-4 text-sm text-muted">The tool router for AI agents on Robinhood Chain. One skill, every on-chain tool, pay per call.</p>
      </div>
      <div class="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-20">
        <div>
          <h4 class="mb-4 font-mono text-xs uppercase tracking-widest text-dimmed">Product</h4>
          <ul class="space-y-2.5 text-sm text-toned"><li><a class="hover:text-highlighted" href="#tools">Tools</a></li><li><a class="hover:text-highlighted" href="#pricing">Pricing</a></li><li><a class="hover:text-highlighted" href="/SKILL.md" target="_blank">SKILL.md</a></li></ul>
        </div>
        <div>
          <h4 class="mb-4 font-mono text-xs uppercase tracking-widest text-dimmed">Network</h4>
          <ul class="space-y-2.5 text-sm text-toned"><li><a class="hover:text-highlighted" href="https://robinhoodchain.blockscout.com" target="_blank" rel="noopener">Explorer</a></li><li><button type="button" class="cursor-pointer hover:text-highlighted" @click="addNetwork">Add network</button></li><li><a class="hover:text-highlighted" href="#network">Live stats</a></li></ul>
        </div>
        <div>
          <h4 class="mb-4 font-mono text-xs uppercase tracking-widest text-dimmed">Community</h4>
          <ul class="space-y-2.5 text-sm text-toned"><li v-for="k in ['x', 'discord', 'github']" :key="k"><button type="button" class="cursor-pointer capitalize hover:text-highlighted" @click="openLink(k)">{{ k === 'x' ? 'X' : k === 'github' ? 'GitHub' : 'Discord' }}</button></li></ul>
        </div>
      </div>
    </UContainer>
    <div class="group mt-16 select-none text-center font-display text-[22vw] font-bold leading-[.8] tracking-[-.05em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.13)] lg:text-[300px]" aria-hidden="true">
      <span class="bg-brand-gradient bg-clip-text bg-no-repeat [background-size:0%_100%] transition-[background-size] duration-[1200ms] ease-out group-hover:[background-size:100%_100%]">ROUTIQ</span>
    </div>
    <UContainer class="mt-10 flex flex-wrap justify-between gap-4 border-t border-default py-6 text-xs text-dimmed">
      <span>© 2026 ROUTIQ</span>
      <span>Independent project, not affiliated with Robinhood Markets, Inc. Nothing here is financial advice.</span>
    </UContainer>
  </footer>
</template>
