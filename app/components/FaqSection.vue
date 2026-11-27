<script setup lang="ts">
const items = [
  { label: 'What is ROUTIQ?', content: 'A tool router for AI agents. One MCP server gives your agent tools to read the chain and to prepare actions (Uniswap swaps, transfers, approval revokes) that you sign yourself. ROUTIQ launches on Elysium, Hyperliquid’s Layer 2; its first tools already run on Robinhood Chain.' },
  { label: 'Which chains does ROUTIQ support?', content: 'Elysium is our launch chain (chain ID 99901, gas in HYPE). Today the live MCP tools run on Robinhood Chain (chain ID 4663): stock tokens, wallets, transactions, market hours and Uniswap swaps. Elysium tools roll out with the launch.' },
  { label: 'Do I need API keys for each provider?', content: 'No. ROUTIQ handles access to every tool in the catalog. Your agent only needs the skill (or MCP server) and a funded balance.' },
  { label: 'How is pricing structured?', content: 'The live MCP tools are free during the beta. Paid tools will be pay per call with no subscription: each tool shows its price before the agent calls it. Prices shown for planned tools are planned prices.' },
  { label: 'Can an agent move my funds?', content: 'No. Action tools only build and simulate transactions, then return a link to routiq.tech/sign. That page decodes every call itself, refuses anything outside exact approvals, short-lived Permit2 allowances, transfers and Uniswap v3/v4 swaps of known tokens, and you sign in your own wallet. ROUTIQ never holds your keys.' },
  { label: 'A tool failed. Am I charged?', content: 'Failed calls are not charged. You pay only for calls that return a result.' },
  { label: 'Which agents are supported?', content: 'Any agent or IDE that supports remote MCP servers (Streamable HTTP) can connect to /mcp today. Agents can also read the skill file. The CLI arrives later.' },
  { label: 'Is there a ROUTIQ token?', content: '$ROUTIQ launches on Elysium. The official contract address will be published only on this site and on @UseRoutiq on X. Until then, any address claiming to be $ROUTIQ is not ours — never trust addresses sent in DMs.' }
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
            trigger: 'py-6 font-display text-lg font-medium text-highlighted hover:text-teal-200 transition-colors',
            body: 'pb-6 text-base leading-relaxed text-muted',
            trailingIcon: 'size-5 text-dimmed'
          }"
        />
      </div>
    </UContainer>
  </section>
</template>
