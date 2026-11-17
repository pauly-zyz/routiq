// ROUTIQ tool catalog. Live tools are served by the MCP endpoint (/mcp) and are free during beta.
// Planned tools show planned per-call prices in USD, paid in USDG.
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
  { id: 'chain_status', name: 'Chain status', category: 'Data', source: 'Robinhood Chain RPC', description: 'Latest block, block age, gas price and average block time.', price: 0, icon: 'i-lucide-activity', status: 'live' },
  { id: 'stock_tokens', name: 'Stock token registry', category: 'Markets', source: 'Robinhood StockFactory', description: 'Search all official stock tokens by ticker or company name, read straight from the factory contract.', price: 0, icon: 'i-lucide-list', status: 'live' },
  { id: 'token_verify', name: 'Token verifier', category: 'Safety', source: 'Robinhood StockFactory', description: 'Tells an official stock token from a look-alike that copies its ticker or the Robinhood name.', price: 0, icon: 'i-lucide-badge-check', status: 'live' },
  { id: 'wallet_portfolio', name: 'Wallet portfolio', category: 'Wallet', source: 'Robinhood Chain RPC', description: 'ETH, USDG and every official stock token held by an address, in one call.', price: 0, icon: 'i-lucide-wallet', status: 'live' },
  { id: 'tx_lookup', name: 'Transaction lookup', category: 'Wallet', source: 'Robinhood Chain RPC', description: 'Status, fee and decoded token transfers of any transaction.', price: 0, icon: 'i-lucide-receipt-text', status: 'live' },
  { id: 'market_hours', name: 'Market hours', category: 'Markets', source: 'Exchange calendar', description: 'Is the US exchange open, pre-market, after-hours or closed, and when it opens next.', price: 0, icon: 'i-lucide-clock', status: 'live' },
  { id: 'swap_quote', name: 'Swap quote', category: 'Trading', source: 'Uniswap v3', description: 'Best Uniswap price between ETH, USDG and any stock token, direct or routed, with price impact.', price: 0, icon: 'i-lucide-route', status: 'live' },
  { id: 'swap_build', name: 'Swap builder', category: 'Trading', source: 'Uniswap SwapRouter02', description: 'Builds and simulates a swap with an exact-amount approval and a slippage limit. You sign it.', price: 0, icon: 'i-lucide-arrow-left-right', status: 'live' },
  { id: 'transfer_build', name: 'Transfer builder', category: 'Wallet', source: 'Robinhood Chain RPC', description: 'Prepares a send of ETH, USDG or a stock token, blocks common mistakes, simulates it. You sign it.', price: 0, icon: 'i-lucide-send', status: 'live' },
  { id: 'approvals_check', name: 'Approval audit', category: 'Safety', source: 'Robinhood Chain RPC', description: 'Finds open token approvals and flags unlimited ones.', price: 0, icon: 'i-lucide-key-round', status: 'live' },
  { id: 'approval_revoke', name: 'Approval revoker', category: 'Safety', source: 'Robinhood Chain RPC', description: 'Builds the transaction that sets an approval back to zero. You sign it.', price: 0, icon: 'i-lucide-shield-off', status: 'live' },
  { id: 'tx_simulate', name: 'Transaction simulator', category: 'Safety', source: 'eth_simulateV1', description: 'Dry-runs any transaction: success, gas and token transfers — before anyone signs.', price: 0, icon: 'i-lucide-flask-conical', status: 'live' },
  { id: 'stock_price', name: 'Stock token price', category: 'Markets', source: 'On-chain pools', description: 'Live on-chain price for TSLA, NVDA, AAPL and other stock tokens.', price: 0.001, icon: 'i-lucide-chart-candlestick', status: 'planned' },
  { id: 'stock_premium', name: 'Premium monitor', category: 'Markets', source: 'Pools + last exchange close', description: 'How far a stock token trades above or below its last exchange price.', price: 0.002, icon: 'i-lucide-trending-up', status: 'planned' },
  { id: 'orderbook_depth', name: 'Order book depth', category: 'Trading', source: 'Arcus', description: 'Bid/ask depth and spread for a pair on the order-book DEX.', price: 0.001, icon: 'i-lucide-bar-chart-3', status: 'planned' },
  { id: 'lending_rates', name: 'USDG lending rates', category: 'DeFi', source: 'Lending pools', description: 'Compare supply and borrow rates across lending pools.', price: 0.001, icon: 'i-lucide-landmark', status: 'planned' },
  { id: 'bridge_quote', name: 'Bridge quote', category: 'DeFi', source: 'Bridges', description: 'Cost and time to move funds in from Ethereum and other L2s.', price: 0.002, icon: 'i-lucide-git-merge', status: 'planned' },
  { id: 'contract_inspect', name: 'Contract inspector', category: 'Data', source: 'Robinhood Chain RPC', description: 'Code, proxy target and token metadata for any contract.', price: 0.001, icon: 'i-lucide-file-code-2', status: 'planned' }
]

export function formatPrice(p: number) {
  return p === 0 ? 'free' : `$${p.toFixed(3)}`
}

export const LIVE_TOOLS = TOOLS.filter(t => t.status === 'live')
