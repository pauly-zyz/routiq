<script setup lang="ts">
const skillUrl = useSkillUrl()
const mcpUrl = useMcpUrl()
const copy = useCopy()
const mcpConfig = computed(() => JSON.stringify({ mcpServers: { routiq: { url: mcpUrl.value } } }, null, 2))
</script>

<template>
  <section id="connect" class="py-24 sm:py-32">
    <UContainer>
      <SectionHeading eyebrow="Connect" center>
        Three ways in. <span class="text-gradient">Same registry, same balance.</span>
      </SectionHeading>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article v-reveal v-spotlight class="glass flex flex-col rounded-3xl p-7">
          <div class="flex items-center justify-between">
            <span class="grid size-11 place-items-center rounded-xl bg-brand-gradient"><UIcon name="i-lucide-sparkles" class="size-5 text-[#04201C]" /></span>
            <UBadge label="available" color="success" variant="subtle" size="sm" />
          </div>
          <h3 class="mt-6 font-display text-2xl font-semibold text-highlighted">Skill</h3>
          <p class="mt-2 text-muted">One line into your agent’s chat. It reads the skill file and learns the tools.</p>
          <button type="button" class="mt-6 flex w-full cursor-pointer items-center gap-2 rounded-xl border border-default bg-black/30 px-4 py-3 text-left font-mono text-xs text-toned transition hover:border-accented" @click="copy(`set up ${skillUrl}`, 'Install command copied')">
            <span class="text-teal-200">$</span><span class="min-w-0 flex-1 truncate">set up {{ skillUrl }}</span><UIcon name="i-lucide-copy" class="size-4 shrink-0 text-dimmed" />
          </button>
        </article>
        <article v-reveal="100" v-spotlight class="glass flex flex-col rounded-3xl p-7">
          <div class="flex items-center justify-between">
            <span class="grid size-11 place-items-center rounded-xl bg-brand-gradient"><UIcon name="i-lucide-plug" class="size-5 text-[#04201C]" /></span>
            <UBadge label="live · beta" color="success" variant="subtle" size="sm" />
          </div>
          <h3 class="mt-6 font-display text-2xl font-semibold text-highlighted">MCP</h3>
          <p class="mt-2 text-muted">Add the remote MCP server to any MCP-compatible agent or IDE. Twelve tools, free during beta. Actions come back as sign links.</p>
          <button type="button" class="mt-6 flex w-full cursor-pointer items-start gap-2 rounded-xl border border-default bg-black/30 px-4 py-3 text-left font-mono text-xs leading-relaxed text-toned transition hover:border-accented" @click="copy(mcpConfig, 'MCP config copied')">
            <span class="min-w-0 flex-1 break-all"><span class="text-emerald-300">"routiq"</span>: { <span class="text-emerald-300">"url"</span>: <span class="text-teal-300">"{{ mcpUrl }}"</span> }</span><UIcon name="i-lucide-copy" class="mt-0.5 size-4 shrink-0 text-dimmed" />
          </button>
        </article>
        <article v-reveal="200" v-spotlight class="glass flex flex-col rounded-3xl p-7">
          <div class="flex items-center justify-between">
            <span class="grid size-11 place-items-center rounded-xl border border-default bg-white/5"><UIcon name="i-lucide-terminal" class="size-5 text-teal-300" /></span>
            <UBadge label="early access" color="neutral" variant="outline" size="sm" />
          </div>
          <h3 class="mt-6 font-display text-2xl font-semibold text-highlighted">CLI</h3>
          <p class="mt-2 text-muted">Discover and run tools from your terminal or scripts.</p>
          <pre class="mt-6 overflow-x-auto rounded-xl border border-default bg-black/30 px-4 py-3 font-mono text-xs leading-relaxed text-toned"><span class="text-teal-200">routiq</span> run token_verify <span class="text-teal-300">--symbol</span> TSLA</pre>
        </article>
      </div>
    </UContainer>
  </section>
</template>
