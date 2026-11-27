<script setup lang="ts">
const site = String(useRuntimeConfig().public.siteUrl || 'https://www.routiq.tech').replace(/\/$/, '')
const description = 'ROUTIQ is the tool router for AI agents, launching on Elysium (Hyperliquid L2). One MCP server to read the chain and prepare swaps and transfers you sign yourself — live on Robinhood Chain today. Free during beta.'

useSeoMeta({
  title: 'ROUTIQ | Every on-chain tool your agent needs — launching on Elysium',
  description,
  ogTitle: 'ROUTIQ — the tool router for AI agents, launching on Elysium',
  ogDescription: description,
  ogType: 'website',
  ogUrl: `${site}/`,
  ogSiteName: 'ROUTIQ',
  ogImage: `${site}/og-banner.png`,
  ogImageWidth: 1500,
  ogImageHeight: 500,
  ogImageAlt: 'ROUTIQ — Every on-chain tool your agent needs.',
  twitterCard: 'summary_large_image',
  twitterImage: `${site}/og-banner.png`
})
useHead({ link: [{ rel: 'canonical', href: `${site}/` }] })
</script>

<template>
  <UApp :toaster="{ position: 'bottom-center' }">
    <NuxtPage />
  </UApp>
</template>
