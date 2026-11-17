<script setup lang="ts">
const site = String(useRuntimeConfig().public.siteUrl || 'https://www.routiq.tech').replace(/\/$/, '')
const description = 'One MCP server connects your AI agent to Robinhood Chain: official stock-token registry and verification, wallet portfolios, transactions and market hours. Free during beta.'

useSeoMeta({
  title: 'ROUTIQ | Every on-chain tool your agent needs, on Robinhood Chain',
  description,
  ogTitle: 'ROUTIQ — the tool router for agents on Robinhood Chain',
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
