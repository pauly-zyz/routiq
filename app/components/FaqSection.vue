<script setup lang="ts">
const items = [
  { label: 'What is ROUTIQ?', content: 'A tool router for AI agents on Robinhood Chain. Your agent gets one skill, then discovers, compares and pays for on-chain tools — prices, swaps, wallets, DeFi and safety checks — per call.' },
  { label: 'Do I need API keys for each provider?', content: 'No. ROUTIQ handles access to every tool in the catalog. Your agent only needs the skill (or MCP server) and a funded balance.' },
  { label: 'How is pricing structured?', content: 'Pay per call, no subscription. Each tool shows its price before the agent calls it, and calls are debited from one USDG balance. Prices on this page are planned prices.' },
  { label: 'Can an agent move my funds?', content: 'Tools that move funds only build a transaction. Your wallet signs it — the agent never holds your keys. You can also set a daily spending cap per agent.' },
  { label: 'A tool failed. Am I charged?', content: 'Failed calls are not charged. You pay only for calls that return a result.' },
  { label: 'Which agents are supported?', content: 'Any agent that can read a skill file, connect to a remote MCP server, or run a CLI. The skill works today; MCP and CLI arrive with early access.' },
  { label: 'Is there a ROUTIQ token?', content: 'The official contract address is published only on this site and our official accounts. Never trust addresses sent in DMs.' }
]
</script>

<template>
  <section id="faq" class="py-24 sm:py-32">
    <UContainer class="grid grid-cols-1 gap-12 lg:grid-cols-[.8fr_1.2fr]">
      <div class="lg:sticky lg:top-28 lg:self-start">
        <SectionHeading eyebrow="FAQ">
          Questions, <span class="text-gradient">answered.</span>
          <template #sub>Still curious? Ask in our community channels.</template>
        </SectionHeading>
      </div>
      <div v-reveal="100">
        <UAccordion
          :items="items"
          :default-value="'0'"
          :ui="{
            item: 'border-b border-default',
            trigger: 'py-6 font-display text-lg font-medium text-highlighted hover:text-violet-300 transition-colors',
            body: 'pb-6 text-base leading-relaxed text-muted',
            trailingIcon: 'size-5 text-dimmed'
          }"
        />
      </div>
    </UContainer>
  </section>
</template>
