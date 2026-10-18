<script setup lang="ts">
const skillUrl = useSkillUrl()
const copy = useCopy()
const tab = ref<'skill' | 'mcp' | 'cli'>('skill')
const tabs = [
  { key: 'skill', label: 'Skill', icon: 'i-lucide-sparkles' },
  { key: 'mcp', label: 'MCP', icon: 'i-lucide-plug' },
  { key: 'cli', label: 'CLI', icon: 'i-lucide-terminal' }
] as const
const command = computed(() => `set up ${skillUrl.value}`)
</script>

<template>
  <div class="w-full max-w-xl">
    <div class="mb-2.5 flex items-center gap-1">
      <button
        v-for="t in tabs" :key="t.key" type="button"
        :class="['inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition', tab === t.key ? 'bg-white/10 text-highlighted' : 'text-muted hover:text-highlighted']"
        @click="tab = t.key"
      >
        <UIcon :name="t.icon" class="size-3.5" />{{ t.label }}
      </button>
      <span class="ml-auto hidden text-xs text-dimmed sm:inline">Give this to your agent</span>
    </div>

    <div class="glass flex min-h-14 items-center gap-3 rounded-2xl py-2 pl-4 pr-2 font-mono text-[13px]">
      <template v-if="tab === 'skill'">
        <span class="text-violet-300">$</span>
        <span class="min-w-0 flex-1 truncate text-highlighted">{{ command }}</span>
        <UButton label="Copy" icon="i-lucide-copy" size="sm" class="bg-brand-gradient text-white" @click="copy(command, 'Install command copied')" />
      </template>
      <template v-else>
        <UIcon name="i-lucide-clock" class="size-4 text-dimmed" />
        <span class="min-w-0 flex-1 truncate text-muted">
          {{ tab === 'mcp' ? 'Remote MCP server — URL published at early access' : 'routiq CLI — released with early access' }}
        </span>
        <UBadge label="soon" color="neutral" variant="outline" size="sm" />
      </template>
    </div>
    <p class="mt-2.5 text-xs text-dimmed">Your agent reads the skill and takes it from there. No per-tool sign-ups.</p>
  </div>
</template>
