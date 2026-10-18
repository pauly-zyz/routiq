<script setup lang="ts">
import { TOOLS, TOOL_CATEGORIES, formatPrice, type ToolCategory } from '~/data/tools'

const openLink = useExternalLink()
const query = ref('')
const cat = ref<ToolCategory | 'All'>('All')
const counts = computed(() => Object.fromEntries(TOOL_CATEGORIES.map(c => [c.label, TOOLS.filter(t => t.category === c.label).length])))
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return TOOLS.filter(t =>
    (cat.value === 'All' || t.category === cat.value)
    && (!q || `${t.name} ${t.id} ${t.description} ${t.source}`.toLowerCase().includes(q))
  )
})
const expanded = ref(false)
const PREVIEW = 9
const shown = computed(() => (expanded.value || query.value || cat.value !== 'All' ? filtered.value : filtered.value.slice(0, PREVIEW)))
const statusColor = { live: 'success', beta: 'info', planned: 'neutral' } as const
</script>

<template>
  <section id="tools" class="relative py-24 sm:py-32">
    <UContainer>
      <SectionHeading eyebrow="Tool catalog">
        One registry. <span class="text-gradient">Every Robinhood Chain tool.</span>
        <template #sub>Prices, trading, wallets, DeFi and safety checks — ranked for your agent by fit and price. Search the catalog planned for launch.</template>
      </SectionHeading>

      <div v-reveal class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <button
            v-for="c in [{ label: 'All', icon: 'i-lucide-layout-grid' }, ...TOOL_CATEGORIES]" :key="c.label" type="button"
            :class="['inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition', cat === c.label ? 'border-violet-400/50 bg-violet-500/15 text-highlighted' : 'border-default text-muted hover:text-highlighted']"
            @click="cat = c.label as ToolCategory | 'All'"
          >
            <UIcon :name="c.icon" class="size-4" />{{ c.label }}
            <span class="font-mono text-[11px] text-dimmed">{{ c.label === 'All' ? TOOLS.length : counts[c.label] }}</span>
          </button>
        </div>
        <UInput v-model="query" icon="i-lucide-search" placeholder="Search tools…" size="lg" class="w-full lg:w-72" :ui="{ base: 'rounded-full bg-white/[.03]' }" />
      </div>

      <TransitionGroup
        tag="div" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 scale-[.97]"
        leave-active-class="transition duration-150 ease-in absolute opacity-0" move-class="transition duration-300"
      >
        <article v-for="t in shown" :key="t.id" v-spotlight class="glass group flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-accented">
          <div class="flex items-start gap-3.5">
            <span class="grid size-11 shrink-0 place-items-center rounded-xl border border-violet-400/25 bg-gradient-to-br from-violet-500/25 to-cyan-400/10">
              <UIcon :name="t.icon" class="size-5 text-highlighted" />
            </span>
            <div class="min-w-0 flex-1">
              <h3 class="font-display text-[17px] font-semibold text-highlighted">{{ t.name }}</h3>
              <p class="truncate font-mono text-xs text-dimmed">{{ t.id }}</p>
            </div>
            <UBadge :label="t.status" :color="statusColor[t.status]" variant="subtle" size="sm" />
          </div>
          <p class="mt-4 flex-1 text-sm leading-relaxed text-muted">{{ t.description }}</p>
          <div class="mt-5 flex items-center justify-between border-t border-default pt-3.5 text-xs">
            <span class="truncate text-dimmed">{{ t.source }}</span>
            <span class="shrink-0 pl-3 font-mono text-toned">{{ formatPrice(t.price) }}<span v-if="t.price" class="text-dimmed"> /call</span></span>
          </div>
        </article>
      </TransitionGroup>

      <div v-if="!filtered.length" class="glass rounded-2xl p-10 text-center text-muted">
        No tool matches “{{ query }}”.
        <UButton label="Suggest it" variant="link" @click="openLink('github')" />
      </div>

      <div v-if="shown.length < filtered.length" class="mt-8 text-center">
        <UButton :label="`Show all ${filtered.length} tools`" trailing-icon="i-lucide-chevron-down" color="neutral" variant="outline" size="lg" @click="expanded = true" />
      </div>

      <p class="mt-6 text-center text-xs text-dimmed">
        Planned catalog and prices. Sources are public on-chain venues and data — listing one does not imply a partnership.
      </p>
    </UContainer>
  </section>
</template>
