<script setup lang="ts">
useSeoMeta({
  title: 'ROUTIQ | Every on-chain tool your agent needs, on Robinhood Chain',
  description: 'One skill connects your AI agent to stock-token prices, swaps, wallets and DeFi on Robinhood Chain. Your agent discovers, compares and pays per call from one USDG balance.',
  ogTitle: 'ROUTIQ — the tool router for agents on Robinhood Chain',
  ogDescription: 'One skill. Every on-chain tool. Pay per call from one balance.',
  ogType: 'website',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp :toaster="{ position: 'bottom-center' }">
    <NuxtPage />
  </UApp>
</template>
