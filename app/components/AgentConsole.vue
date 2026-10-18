<script setup lang="ts">
import { AGENT_DEMOS, type DemoStep } from '~/data/agentDemos'

// Simulated agent session: the agent discovers tools, runs them and pays per call.
const { state: chain, gasGwei } = useChain()
const START_BALANCE = 5
const balance = ref(START_BALANCE)
const active = ref(0)
type Line = Omit<DemoStep, 'kind'> & { kind: DemoStep['kind'] | 'prompt', typed?: string, key: number }
const lines = ref<Line[]>([])
const body = ref<HTMLElement>()
let runId = 0
let key = 0
let reduce = false

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
const scrollDown = () => nextTick(() => { if (body.value) body.value.scrollTop = body.value.scrollHeight })

function liveChainText() {
  const s = chain.value
  if (s.status !== 'live' || s.block === null) return 'RPC not reachable from this browser — try again later'
  const bt = s.blockTimeMs ? ` · ~${Math.round(s.blockTimeMs)} ms blocks` : ''
  return `block ${s.block.toLocaleString('en-US')} · gas ${formatGwei(gasGwei.value)} gwei${bt}`
}

async function play(index: number) {
  const id = ++runId
  active.value = index
  const demo = AGENT_DEMOS[index]!
  lines.value = []
  const push = (l: Omit<Line, 'key'>) => { lines.value.push({ ...l, key: key++ }); scrollDown() }

  push({ kind: 'prompt', text: demo.prompt, typed: reduce ? demo.prompt : '' })
  if (!reduce) {
    const line = lines.value[lines.value.length - 1]!
    for (let i = 1; i <= demo.prompt.length; i++) {
      if (id !== runId) return
      line.typed = demo.prompt.slice(0, i)
      await wait(22)
    }
    await wait(350)
  }

  for (const step of demo.steps) {
    if (id !== runId) return
    const text = step.live === 'chain' ? liveChainText() : step.text
    const typedStep = step.kind === 'discover' || step.kind === 'run'
    push({ ...step, text, typed: typedStep && !reduce ? '' : text })
    if (typedStep && !reduce) {
      const line = lines.value[lines.value.length - 1]!
      for (let i = 1; i <= text.length; i += 2) {
        if (id !== runId) return
        line.typed = text.slice(0, i + 1)
        await wait(12)
      }
      line.typed = text
    }
    if (step.kind === 'run' && step.cost) balance.value = Math.max(0, balance.value - step.cost)
    if (!reduce) await wait(step.kind === 'result' ? 700 : step.kind === 'candidate' ? 260 : 420)
  }
  if (reduce) return
  await wait(4200)
  if (id === runId) play((index + 1) % AGENT_DEMOS.length)
}

function choose(i: number) {
  if (balance.value < 0.05) balance.value = START_BALANCE
  play(i)
}

const spent = computed(() => START_BALANCE - balance.value)
onMounted(() => {
  reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  play(0)
})
onBeforeUnmount(() => { runId++ })
</script>

<template>
  <div class="border-beam relative rounded-[28px] bg-[#0A0A12]/90 shadow-[0_40px_120px_-40px_rgba(124,92,255,.55)] backdrop-blur-xl">
    <!-- window bar -->
    <div class="flex items-center gap-2 border-b border-default px-4 py-3">
      <span class="size-2.5 rounded-full bg-white/15" /><span class="size-2.5 rounded-full bg-white/15" /><span class="size-2.5 rounded-full bg-white/15" />
      <span class="ml-2 truncate font-mono text-xs text-dimmed">agent · routiq skill</span>
      <UBadge class="ml-auto" label="demo" color="warning" variant="subtle" size="sm" />
      <span class="flex items-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1 font-mono text-[11px] text-white tabular-nums">
        <UIcon name="i-lucide-wallet" class="size-3" />${{ balance.toFixed(3) }}
      </span>
    </div>

    <!-- transcript -->
    <div ref="body" class="no-scrollbar h-[330px] space-y-2.5 overflow-y-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed sm:h-[360px]" aria-live="polite">
      <div v-for="l in lines" :key="l.key" class="line-in">
        <div v-if="l.kind === 'prompt'" class="mb-3 flex items-start gap-2.5 rounded-2xl bg-white/[.04] p-3 font-sans text-sm text-highlighted">
          <span class="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] text-toned">you</span>
          <span>{{ l.typed }}<span v-if="l.typed !== l.text" class="caret text-cyan-300" /></span>
        </div>
        <div v-else class="flex items-baseline gap-2.5" :class="l.kind === 'candidate' ? 'pl-6 text-muted' : ''">
          <UIcon
            v-if="l.kind !== 'candidate'"
            :name="l.kind === 'discover' ? 'i-lucide-search' : l.kind === 'run' ? 'i-lucide-play' : l.kind === 'result' ? 'i-lucide-check' : 'i-lucide-info'"
            :class="['size-3.5 shrink-0 translate-y-0.5', l.kind === 'discover' ? 'text-cyan-300' : l.kind === 'run' ? 'text-violet-300' : l.kind === 'result' ? 'text-emerald-400' : 'text-dimmed']"
          />
          <span v-else class="text-dimmed">↳</span>
          <span :class="['min-w-0 break-words', l.kind === 'result' ? 'text-emerald-300' : l.kind === 'note' ? 'italic text-dimmed' : l.kind === 'run' || l.kind === 'discover' ? 'text-highlighted' : '']">
            {{ l.typed }}<span v-if="l.typed !== l.text" class="caret" />
          </span>
          <span v-if="l.cost !== undefined" class="ml-auto shrink-0 pl-3 text-[11px] text-dimmed tabular-nums">
            {{ l.kind === 'run' ? (l.cost ? `−$${l.cost.toFixed(3)}` : 'free') : (l.cost ? `$${l.cost.toFixed(3)}` : 'free') }}
          </span>
        </div>
      </div>
    </div>

    <!-- prompt chips -->
    <div class="border-t border-default p-3">
      <div class="mb-2 flex items-center justify-between px-1 text-[11px] text-dimmed">
        <span>Try a prompt</span>
        <span class="font-mono tabular-nums">spent ${{ spent.toFixed(3) }} · no subscription</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="(d, i) in AGENT_DEMOS"
          :key="d.short"
          type="button"
          :class="[
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition cursor-pointer',
            active === i ? 'border-violet-400/60 bg-violet-500/15 text-highlighted' : 'border-default text-muted hover:border-accented hover:text-highlighted'
          ]"
          @click="choose(i)"
        >
          <UIcon :name="d.icon" class="size-3.5" />{{ d.short }}
        </button>
      </div>
    </div>
  </div>
</template>
