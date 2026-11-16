<script setup lang="ts">
// Live console: every run makes a real call to this site's MCP server (/mcp).
type Kind = 'prompt' | 'discover' | 'run' | 'result' | 'warn' | 'note' | 'error'
interface Line { kind: Kind, text: string, typed: string, key: number }
interface Plan { prompt: string, discover: string, tool: string, args: Record<string, unknown> }

const { callTool } = useRoutiqMcp()
const { account, connect } = useWallet()
const lines = ref<Line[]>([])
const body = ref<HTMLElement>()
const busy = ref(false)
const query = ref('')
const calls = ref(0)
let key = 0
let reduce = false

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
const num = (s: string | number, dp = 4) => Number(s).toLocaleString('en-US', { maximumFractionDigits: dp })
const wait = (ms: number) => new Promise(r => setTimeout(r, reduce ? 0 : ms))
const scrollDown = () => nextTick(() => { if (body.value) body.value.scrollTop = body.value.scrollHeight })

async function push(kind: Kind, text: string, type = false) {
  const line: Line = { kind, text, typed: type && !reduce ? '' : text, key: key++ }
  lines.value.push(line)
  const ref_ = lines.value[lines.value.length - 1]!
  scrollDown()
  if (type && !reduce) {
    for (let i = 1; i <= text.length; i += 2) { ref_.typed = text.slice(0, i + 1); await wait(10) }
    ref_.typed = text
  }
}

// Turn a tool's JSON into a few readable lines.
function summarize(tool: string, r: any): { kind: Kind, text: string }[] {
  switch (tool) {
    case 'chain_status':
      return [{ kind: 'result', text: `block ${num(r.latestBlock, 0)} · gas ${r.gasPriceGwei} gwei · ~${r.avgBlockTimeMs} ms blocks` }]
    case 'market_hours': {
      const out: { kind: Kind, text: string }[] = [{ kind: 'result', text: `${r.exchange}: ${r.session}${r.regularSessionOpen ? '' : ''} · New York ${r.timeInNewYork.slice(11)} (${r.day})` }]
      if (r.nextRegularOpen && !r.regularSessionOpen) out.push({ kind: 'note', text: `next regular open ${new Date(r.nextRegularOpen).toUTCString().slice(0, 22)} UTC` })
      out.push({ kind: 'note', text: 'stock tokens keep trading 24/7 on Robinhood Chain' })
      return out
    }
    case 'token_verify':
      if (r.verdict === 'official_stock_token') {
        const t = r.official?.[0] ?? r
        return [{ kind: 'result', text: `official ✓ ${t.name}` }, { kind: 'note', text: `${t.symbol} · ${t.address}` }]
      }
      if (r.verdict === 'known_stablecoin') return [{ kind: 'result', text: `known stablecoin ✓ ${r.name} (${r.symbol}) · ${r.decimals} decimals` }]
      if (r.verdict === 'impersonation_risk') return [{ kind: 'warn', text: `look-alike ⚠ ${r.symbol ?? '?'} is NOT the official token` }, ...(r.officialAddressForThisTicker ? [{ kind: 'note' as Kind, text: `official address ${r.officialAddressForThisTicker}` }] : [])]
      if (r.verdict === 'not_listed') return [{ kind: 'warn', text: `no official Robinhood stock token uses ${r.symbol}` }]
      return [{ kind: 'note', text: `${r.symbol ? `${r.symbol} — ` : ''}not a Robinhood stock token` }]
    case 'stock_tokens':
      if (!r.matches) return [{ kind: 'warn', text: 'no official stock token matches that name' }]
      return [
        ...r.tokens.slice(0, 3).map((t: any) => ({ kind: 'result' as Kind, text: `${t.symbol} · ${t.name} · ${short(t.address)}` })),
        { kind: 'note', text: `${r.matches} match${r.matches > 1 ? 'es' : ''} · ${r.totalOfficialTokens} official tokens in the registry` }
      ]
    case 'wallet_portfolio': {
      const h = r.holdings as any[]
      const out: { kind: Kind, text: string }[] = [{ kind: 'result', text: `${short(r.address)} · ${num(r.eth)} ETH · ${h.length} token${h.length === 1 ? '' : 's'}` }]
      h.slice(0, 4).forEach(x => out.push({ kind: 'note', text: `${x.symbol} ${num(x.amount)}` }))
      if (h.length > 4) out.push({ kind: 'note', text: `+${h.length - 4} more` })
      return out
    }
    case 'tx_lookup':
      return [
        { kind: r.status === 'success' ? 'result' : 'warn', text: `${r.status} · block ${num(r.block, 0)} · fee ${r.feeEth} ETH` },
        ...r.transfers.slice(0, 3).map((t: any) => ({ kind: 'note' as Kind, text: `${num(t.amount)} ${t.symbol}  ${short(t.from)} → ${short(t.to)}` }))
      ]
  }
  return [{ kind: 'result', text: JSON.stringify(r).slice(0, 140) }]
}

async function run(plan: Plan) {
  if (busy.value) return
  busy.value = true
  lines.value = []
  try {
    await push('prompt', plan.prompt, true)
    await wait(250)
    await push('discover', `routiq.discover("${plan.discover}")`, true)
    await wait(200)
    await push('run', `routiq.run("${plan.tool}"${Object.keys(plan.args).length ? `, ${JSON.stringify(plan.args)}` : ''})`, true)
    let result = await callTool(plan.tool, plan.args)
    calls.value++
    let tool = plan.tool
    // A plain wallet, or a contract that is not a token (e.g. a smart wallet): show its portfolio instead.
    const notAToken = result?.verdict === 'not_a_contract' || (result?.verdict === 'unknown_token' && !result?.symbol)
    if (tool === 'token_verify' && notAToken) {
      await push('note', result.verdict === 'not_a_contract' ? 'no contract here — looks like a wallet' : 'not a token — checking it as a wallet')
      await push('run', `routiq.run("wallet_portfolio", {"address":"${short(String(plan.args.address))}"})`, true)
      tool = 'wallet_portfolio'
      result = await callTool(tool, { address: plan.args.address })
      calls.value++
    } else if (tool === 'token_verify' && result?.verdict === 'not_listed') {
      await push('run', `routiq.run("stock_tokens", {"query":"${plan.args.symbol}"})`, true)
      tool = 'stock_tokens'
      const alt = await callTool(tool, { query: plan.args.symbol, limit: 3 })
      calls.value++
      if (alt.matches) result = alt
      else tool = 'token_verify'
    }
    for (const l of summarize(tool, result)) { await push(l.kind, l.text); await wait(120) }
  } catch (err: any) {
    await push('error', String(err?.data?.message || err?.message || err).slice(0, 160))
  } finally {
    busy.value = false
  }
}

const PRESETS: { label: string, icon: string, plan: () => Plan | null }[] = [
  { label: 'Market open?', icon: 'i-lucide-clock', plan: () => ({ prompt: 'Is the US stock market open right now?', discover: 'us market hours', tool: 'market_hours', args: {} }) },
  { label: 'Verify TSLA', icon: 'i-lucide-badge-check', plan: () => ({ prompt: 'Which TSLA token is the official one?', discover: 'verify stock token', tool: 'token_verify', args: { symbol: 'TSLA' } }) },
  { label: 'Find NVIDIA', icon: 'i-lucide-search', plan: () => ({ prompt: 'Find the NVIDIA stock token', discover: 'stock token registry', tool: 'stock_tokens', args: { query: 'nvidia', limit: 3 } }) },
  { label: 'Chain status', icon: 'i-lucide-activity', plan: () => ({ prompt: 'Check Robinhood Chain before I trade', discover: 'chain gas status', tool: 'chain_status', args: {} }) },
  {
    label: 'My wallet', icon: 'i-lucide-wallet',
    plan: () => account.value
      ? { prompt: 'What does my wallet hold on Robinhood Chain?', discover: 'wallet portfolio', tool: 'wallet_portfolio', args: { address: account.value } }
      : null
  }
]

async function choose(p: typeof PRESETS[number]) {
  const plan = p.plan()
  if (plan) return run(plan)
  await connect()
  const next = p.plan()
  if (next) run(next)
}

function planFor(input: string): Plan | null {
  const q = input.trim()
  if (!q) return null
  if (/^0x[0-9a-fA-F]{64}$/.test(q)) return { prompt: `Explain transaction ${short(q)}`, discover: 'transaction lookup', tool: 'tx_lookup', args: { hash: q } }
  if (/^0x[0-9a-fA-F]{40}$/.test(q)) return { prompt: `What is ${short(q)}?`, discover: 'token or wallet check', tool: 'token_verify', args: { address: q } }
  if (/^[A-Za-z.]{1,6}$/.test(q)) return { prompt: `Is ${q.toUpperCase()} an official stock token?`, discover: 'verify stock token', tool: 'token_verify', args: { symbol: q.toUpperCase() } }
  return { prompt: `Find the ${q} stock token`, discover: 'stock token registry', tool: 'stock_tokens', args: { query: q.slice(0, 64), limit: 3 } }
}

function submit() {
  const plan = planFor(query.value)
  if (plan) { run(plan); query.value = '' }
}

onMounted(() => {
  reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  run(PRESETS[0]!.plan()!)
})
</script>

<template>
  <div class="border-beam relative rounded-[28px] bg-[#0A0A12]/90 shadow-[0_40px_120px_-40px_rgba(124,92,255,.55)] backdrop-blur-xl">
    <!-- window bar -->
    <div class="flex items-center gap-2 border-b border-default px-4 py-3">
      <span class="size-2.5 rounded-full bg-white/15" /><span class="size-2.5 rounded-full bg-white/15" /><span class="size-2.5 rounded-full bg-white/15" />
      <span class="ml-2 truncate font-mono text-xs text-dimmed">agent · routiq mcp</span>
      <span class="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[11px] text-emerald-300">
        <span class="pulse-dot size-1.5 rounded-full bg-emerald-400" />live
      </span>
      <span class="hidden whitespace-nowrap rounded-full bg-brand-gradient px-3 py-1 font-mono text-[11px] text-white sm:inline">free beta</span>
    </div>

    <!-- transcript -->
    <div ref="body" class="no-scrollbar h-[300px] space-y-2.5 overflow-y-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed sm:h-[320px]" aria-live="polite">
      <div v-for="l in lines" :key="l.key" class="line-in">
        <div v-if="l.kind === 'prompt'" class="mb-3 flex items-start gap-2.5 rounded-2xl bg-white/[.04] p-3 font-sans text-sm text-highlighted">
          <span class="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] text-toned">you</span>
          <span class="min-w-0 break-words">{{ l.typed }}<span v-if="l.typed !== l.text" class="caret text-cyan-300" /></span>
        </div>
        <div v-else class="flex items-baseline gap-2.5" :class="l.kind === 'note' ? 'pl-6 text-muted' : ''">
          <UIcon
            v-if="l.kind !== 'note'"
            :name="{ discover: 'i-lucide-search', run: 'i-lucide-play', result: 'i-lucide-check', warn: 'i-lucide-triangle-alert', error: 'i-lucide-circle-x', prompt: '', note: '' }[l.kind]"
            :class="['size-3.5 shrink-0 translate-y-0.5', { discover: 'text-cyan-300', run: 'text-violet-300', result: 'text-emerald-400', warn: 'text-amber-300', error: 'text-red-400', prompt: '', note: '' }[l.kind]]"
          />
          <span v-else class="text-dimmed">↳</span>
          <span :class="['min-w-0 break-all', { result: 'text-emerald-300', warn: 'text-amber-200', error: 'text-red-300', run: 'text-highlighted', discover: 'text-highlighted', note: '', prompt: '' }[l.kind]]">
            {{ l.typed }}<span v-if="l.typed !== l.text" class="caret" />
          </span>
        </div>
      </div>
      <div v-if="busy && lines.length && lines[lines.length - 1]!.kind === 'run'" class="flex items-center gap-2 pl-6 text-dimmed">
        <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />calling Robinhood Chain…
      </div>
    </div>

    <!-- input + presets -->
    <div class="border-t border-default p-3">
      <form class="mb-2.5 flex items-center gap-2 rounded-full border border-default bg-white/[.03] py-1 pl-4 pr-1 focus-within:border-violet-400/50" @submit.prevent="submit">
        <UIcon name="i-lucide-sparkles" class="size-4 shrink-0 text-violet-300" />
        <input
          v-model="query"
          class="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-highlighted outline-none placeholder:text-dimmed"
          placeholder="Ticker, company, wallet or tx hash…"
          aria-label="Ask ROUTIQ"
          maxlength="80"
        >
        <UButton type="submit" icon="i-lucide-arrow-up" size="sm" class="bg-brand-gradient text-white" :loading="busy" :disabled="!query.trim()" aria-label="Run" />
      </form>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="p in PRESETS" :key="p.label" type="button" :disabled="busy"
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-default px-3 py-1.5 text-xs text-muted transition hover:border-accented hover:text-highlighted disabled:cursor-wait disabled:opacity-60"
          @click="choose(p)"
        >
          <UIcon :name="p.icon" class="size-3.5" />{{ p.label }}
        </button>
      </div>
      <p class="mt-2.5 px-1 text-[11px] text-dimmed">Real results from Robinhood Chain via this site’s MCP server · {{ calls }} call{{ calls === 1 ? '' : 's' }} this visit</p>
    </div>
  </div>
</template>
