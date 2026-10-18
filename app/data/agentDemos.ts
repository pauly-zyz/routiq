// Scripted, simulated agent sessions for the hero console. Results are illustrative only.
export interface DemoStep {
  kind: 'discover' | 'candidate' | 'run' | 'result' | 'note'
  text: string
  cost?: number
  live?: 'chain'
}
export interface AgentDemo {
  prompt: string
  short: string
  icon: string
  steps: DemoStep[]
}

export const AGENT_DEMOS: AgentDemo[] = [
  {
    prompt: 'Buy $500 of NVDA with USDG at the best price',
    short: 'Buy NVDA',
    icon: 'i-lucide-shopping-cart',
    steps: [
      { kind: 'discover', text: 'routiq.discover("stock token swap NVDA")' },
      { kind: 'candidate', text: 'route.quote · splits across venues', cost: 0.002 },
      { kind: 'candidate', text: 'orderbook.depth · single venue only', cost: 0.001 },
      { kind: 'run', text: 'routiq.run("route.quote", { sell: "USDG", buy: "NVDA", amount: 500 })', cost: 0.002 },
      { kind: 'result', text: 'best route 64% Uniswap · 36% Arcus · est. 2.77 NVDA' },
      { kind: 'run', text: 'routiq.run("swap.build", { quote })', cost: 0.004 },
      { kind: 'result', text: 'transaction ready · waiting for your signature' }
    ]
  },
  {
    prompt: 'Is TSLA trading above its exchange price right now?',
    short: 'TSLA premium',
    icon: 'i-lucide-trending-up',
    steps: [
      { kind: 'discover', text: 'routiq.discover("stock token premium")' },
      { kind: 'candidate', text: 'stock.premium · on-chain vs last close', cost: 0.002 },
      { kind: 'candidate', text: 'stock.price · on-chain price only', cost: 0.001 },
      { kind: 'run', text: 'routiq.run("stock.premium", { symbol: "TSLA" })', cost: 0.002 },
      { kind: 'result', text: 'TSLA token +0.31% vs last close · exchange closed' },
      { kind: 'note', text: 'stock tokens keep trading while the exchange is closed' }
    ]
  },
  {
    prompt: 'Where can I earn the most on my idle USDG?',
    short: 'USDG yield',
    icon: 'i-lucide-landmark',
    steps: [
      { kind: 'discover', text: 'routiq.discover("USDG lending yield")' },
      { kind: 'candidate', text: 'lending.rates · compares pools', cost: 0.001 },
      { kind: 'candidate', text: 'wallet.portfolio · finds idle balance', cost: 0.001 },
      { kind: 'run', text: 'routiq.run("wallet.portfolio", { address: "0x7a…c3" })', cost: 0.001 },
      { kind: 'result', text: '1,850 USDG idle · 3 stock tokens held' },
      { kind: 'run', text: 'routiq.run("lending.rates", { asset: "USDG" })', cost: 0.001 },
      { kind: 'result', text: '3 pools found · best supply rate shown first' }
    ]
  },
  {
    prompt: 'Check Robinhood Chain gas before I trade',
    short: 'Gas check',
    icon: 'i-lucide-fuel',
    steps: [
      { kind: 'discover', text: 'routiq.discover("chain gas status")' },
      { kind: 'candidate', text: 'chain.status · live from RPC', cost: 0 },
      { kind: 'run', text: 'routiq.run("chain.status")', cost: 0 },
      { kind: 'result', text: '', live: 'chain' },
      { kind: 'note', text: 'this result is real — read from the public RPC just now' }
    ]
  }
]
