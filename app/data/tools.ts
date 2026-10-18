// Planned ROUTIQ tool catalog. Prices are planned per-call prices in USD, paid in USDG.
// "source" names the public on-chain venue or data the tool reads; it does not imply a partnership.
export type ToolCategory = 'Markets' | 'Trading' | 'Wallet' | 'DeFi' | 'Data' | 'Safety'
export type ToolStatus = 'live' | 'beta' | 'planned'

export interface Tool {
  id: string
  name: string
  category: ToolCategory
  source: string
  description: string
  price: number
  icon: string
  status: ToolStatus
}

export const TOOL_CATEGORIES: { label: ToolCategory, icon: string }[] = [
  { label: 'Markets', icon: 'i-lucide-chart-candlestick' },
  { label: 'Trading', icon: 'i-lucide-arrow-left-right' },
  { label: 'Wallet', icon: 'i-lucide-wallet' },
  { label: 'DeFi', icon: 'i-lucide-landmark' },
  { label: 'Data', icon: 'i-lucide-database' },
  { label: 'Safety', icon: 'i-lucide-shield-check' }
]

export const TOOLS: Tool[] = [
  { id: 'chain.status', name: 'Chain status', category: 'Data', source: 'Robinhood Chain RPC', description: 'Latest block, gas price and measured block time.', price: 0, icon: 'i-lucide-activity', status: 'live' },
  { id: 'stock.price', name: 'Stock token price', category: 'Markets', source: 'On-chain pools', description: 'Live on-chain price for TSLA, NVDA, AAPL and other stock tokens.', price: 0.001, icon: 'i-lucide-chart-candlestick', status: 'planned' },
  { id: 'stock.premium', name: 'Premium monitor', category: 'Markets', source: 'Pools + last exchange close', description: 'How far a stock token trades above or below its last exchange price.', price: 0.002, icon: 'i-lucide-trending-up', status: 'planned' },
  { id: 'market.hours', name: 'Market hours', category: 'Markets', source: 'Exchange calendar', description: 'Whether the US exchange is open, so agents know when tokens lead price.', price: 0, icon: 'i-lucide-clock', status: 'planned' },
  { id: 'route.quote', name: 'Best-route quote', category: 'Trading', source: 'Uniswap · Arcus · Pleiades', description: 'Splits an order across venues for the lowest total price impact.', price: 0.002, icon: 'i-lucide-route', status: 'planned' },
  { id: 'swap.build', name: 'Swap builder', category: 'Trading', source: 'ROUTIQ router', description: 'Builds the swap transaction. The user always signs in their own wallet.', price: 0.004, icon: 'i-lucide-arrow-left-right', status: 'planned' },
  { id: 'orderbook.depth', name: 'Order book depth', category: 'Trading', source: 'Arcus', description: 'Bid/ask depth and spread for a pair on the order-book DEX.', price: 0.001, icon: 'i-lucide-bar-chart-3', status: 'planned' },
  { id: 'perps.funding', name: 'Perps funding', category: 'Trading', source: 'Lighter', description: 'Funding rates and open interest for perpetual markets.', price: 0.001, icon: 'i-lucide-gauge', status: 'planned' },
  { id: 'wallet.portfolio', name: 'Wallet portfolio', category: 'Wallet', source: 'Blockscout', description: 'Stock tokens, stablecoins and ETH held by an address, valued in USD.', price: 0.001, icon: 'i-lucide-wallet', status: 'planned' },
  { id: 'wallet.history', name: 'Transaction history', category: 'Wallet', source: 'Blockscout', description: 'Decoded transfers and swaps for any address.', price: 0.001, icon: 'i-lucide-history', status: 'planned' },
  { id: 'wallet.approvals', name: 'Approval audit', category: 'Wallet', source: 'Blockscout', description: 'Lists token approvals so users can revoke risky ones.', price: 0.002, icon: 'i-lucide-key-round', status: 'planned' },
  { id: 'lending.rates', name: 'USDG lending rates', category: 'DeFi', source: 'Lending pools', description: 'Compare supply and borrow rates across lending pools.', price: 0.001, icon: 'i-lucide-landmark', status: 'planned' },
  { id: 'bridge.quote', name: 'Bridge quote', category: 'DeFi', source: 'Bridges', description: 'Cost and time to move funds in from Ethereum and other L2s.', price: 0.002, icon: 'i-lucide-git-merge', status: 'planned' },
  { id: 'contract.inspect', name: 'Contract inspector', category: 'Data', source: 'Blockscout', description: 'Verified source, ABI and deployer for any contract.', price: 0.001, icon: 'i-lucide-file-code-2', status: 'planned' },
  { id: 'token.verify', name: 'Token verifier', category: 'Safety', source: 'Issuer lists', description: 'Flags copycat tickers and confirms official stock-token contracts.', price: 0.001, icon: 'i-lucide-badge-check', status: 'planned' },
  { id: 'tx.simulate', name: 'Transaction simulator', category: 'Safety', source: 'Chain fork', description: 'Shows balance changes before the user signs anything.', price: 0.003, icon: 'i-lucide-flask-conical', status: 'planned' }
]

export function formatPrice(p: number) {
  return p === 0 ? 'free' : `$${p.toFixed(3)}`
}
