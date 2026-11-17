// ROUTIQ MCP server: read tools and action tools for Robinhood Chain. Free during beta.
// Action tools never send anything: they return unsigned transactions and a /sign link for the user's own wallet.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { formatEther, formatGwei, formatUnits, getAddress, isAddress, isHash, type Address } from 'viem'
import { z } from 'zod'
import { USDG, STOCK_FACTORY, chainClient, erc20Abi, explorerAddress, explorerTx, stockTokens } from './chain'
import { marketStatus } from './marketHours'
import { UserError, buildRevoke, buildSwap, buildTransfer, checkApprovals, simulateArbitrary, swapQuote } from './actions'

export const SERVER_INFO = { name: 'routiq', version: '0.2.0' }

export const TOOL_SUMMARY = [
  { name: 'chain_status', description: 'Latest block, gas price and average block time on Robinhood Chain.' },
  { name: 'stock_tokens', description: 'Search the official Robinhood stock-token registry (read from the StockFactory contract).' },
  { name: 'token_verify', description: 'Check whether a token address or ticker is an official Robinhood stock token, or a look-alike.' },
  { name: 'wallet_portfolio', description: 'ETH, USDG and stock-token balances held by an address.' },
  { name: 'tx_lookup', description: 'Status, fee and decoded token transfers of a transaction.' },
  { name: 'market_hours', description: 'Whether the US stock exchange is open, and when it opens next.' },
  { name: 'swap_quote', description: 'Best Uniswap price for swapping ETH, USDG and stock tokens, with price impact.' },
  { name: 'swap_build', description: 'Build and simulate a swap; returns a sign link for the user\'s wallet.' },
  { name: 'transfer_build', description: 'Build and simulate sending ETH, USDG or a stock token; returns a sign link.' },
  { name: 'approvals_check', description: 'List token approvals a wallet has given to Uniswap contracts (and others you name).' },
  { name: 'approval_revoke', description: 'Build a transaction that revokes a token approval; returns a sign link.' },
  { name: 'tx_simulate', description: 'Simulate any transaction before signing: success, gas and token transfers.' }
]

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const
const json = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] })
const fail = (message: string) => ({ content: [{ type: 'text' as const, text: message }], isError: true })
const trim = (s: string, dp = 6) => (s.includes('.') ? s.replace(new RegExp(`(\\.\\d{0,${dp}})\\d*$`), '$1').replace(/\.?0+$/, '') : s)

async function withChain<T>(fn: () => Promise<T>) {
  try { return await fn() } catch (err: any) {
    if (err instanceof UserError) return fail(err.message) as T
    const msg = String(err?.shortMessage || err?.message || err)
    return fail(`Robinhood Chain RPC request failed: ${msg.slice(0, 300)}. Try again in a few seconds.`) as T
  }
}

export function createRoutiqServer() {
  const server = new McpServer(SERVER_INFO, {
    instructions: [
      'ROUTIQ gives agents tools for Robinhood Chain (Ethereum L2 on Arbitrum Orbit, chain ID 4663, gas in ETH).',
      'Action tools (swap_build, transfer_build, approval_revoke) never send anything: they simulate the transactions and return a signUrl. Give the user the signUrl so they can review and sign in their own wallet; never claim an action happened until the user confirms.',
      'Use stock_tokens / token_verify before trusting any stock-token address: only tokens created by the Robinhood StockFactory are official.',
      'Amounts are token units, not USD. Never ask for private keys. Stock-token eligibility depends on the user\'s jurisdiction; do not help bypass it.'
    ].join(' ')
  })

  server.registerTool('chain_status', {
    title: 'Chain status',
    description: 'Latest block number, block age, gas price (gwei) and average block time over the last 10,000 blocks on Robinhood Chain.',
    inputSchema: {},
    annotations: READ_ONLY
  }, () => withChain(async () => {
    const c = chainClient()
    const [latest, gasPrice] = await Promise.all([c.getBlock(), c.getGasPrice()])
    const span = 10_000n
    const past = await c.getBlock({ blockNumber: latest.number! - span })
    const avgMs = Number(latest.timestamp - past.timestamp) * 1000 / Number(span)
    return json({
      chainId: 4663,
      latestBlock: Number(latest.number),
      blockTime: new Date(Number(latest.timestamp) * 1000).toISOString(),
      blockAgeSeconds: Math.max(0, Math.round(Date.now() / 1000 - Number(latest.timestamp))),
      gasPriceGwei: Number(formatGwei(gasPrice)),
      avgBlockTimeMs: Math.round(avgMs),
      explorer: 'https://robinhoodchain.blockscout.com'
    })
  }))

  server.registerTool('stock_tokens', {
    title: 'Stock token registry',
    description: 'Search official Robinhood stock tokens by ticker or company name. The list is read from events of the Robinhood StockFactory contract, so look-alike tokens never appear here.',
    inputSchema: {
      query: z.string().max(64).optional().describe('Ticker or name, e.g. "TSLA" or "nvidia". Leave empty to list all.'),
      limit: z.number().int().min(1).max(300).optional().describe('Maximum results (default 25).')
    },
    annotations: READ_ONLY
  }, async ({ query, limit }) => {
    const reg = await stockTokens()
    const q = query?.trim().toLowerCase()
    let list = reg.tokens
    if (q) {
      const exact = list.filter(t => t.symbol.toLowerCase() === q)
      const rest = list.filter(t => !exact.includes(t) && (t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)))
      list = [...exact, ...rest]
    }
    return json({
      totalOfficialTokens: reg.tokens.length,
      matches: list.length,
      registryUpToDate: reg.live,
      factory: STOCK_FACTORY,
      tokens: list.slice(0, limit ?? 25).map(t => ({ ...t, decimals: 18, explorer: explorerAddress(t.address) }))
    })
  })

  server.registerTool('token_verify', {
    title: 'Token verifier',
    description: 'Check a token address or ticker. Returns whether it is an official Robinhood stock token, USDG, an impersonation risk (look-alike ticker or name), or an unknown token.',
    inputSchema: {
      address: z.string().optional().describe('Token contract address (0x…).'),
      symbol: z.string().max(32).optional().describe('Ticker to look up, e.g. "AAPL".')
    },
    annotations: READ_ONLY
  }, ({ address, symbol }) => withChain(async () => {
    const reg = await stockTokens()
    if (!address && !symbol) return fail('Provide an address or a symbol.')

    if (!address) {
      const s = symbol!.trim().toUpperCase()
      if (s === 'USDG') return json({ verdict: 'known_stablecoin', ...USDG, note: 'Address from public developer docs; name and decimals confirmed on-chain.' })
      const hits = reg.tokens.filter(t => t.symbol.toUpperCase() === s)
      return json(hits.length
        ? { verdict: 'official_stock_token', symbol: s, official: hits.map(t => ({ ...t, explorer: explorerAddress(t.address) })), warning: 'Any other contract using this ticker is NOT an official Robinhood stock token.' }
        : { verdict: 'not_listed', symbol: s, note: 'No official Robinhood stock token uses this ticker. Treat tokens claiming it with caution.' })
    }

    if (!isAddress(address)) return fail('That is not a valid 0x address.')
    const addr = getAddress(address)
    const official = reg.tokens.find(t => t.address === addr)
    if (official) return json({ verdict: 'official_stock_token', ...official, decimals: 18, explorer: explorerAddress(addr) })
    if (addr === USDG.address) return json({ verdict: 'known_stablecoin', ...USDG, explorer: explorerAddress(addr) })

    const c = chainClient()
    const code = await c.getCode({ address: addr })
    if (!code || code === '0x') return json({ verdict: 'not_a_contract', address: addr, note: 'No contract code at this address (it may be a wallet).' })
    const meta = await c.multicall({
      allowFailure: true,
      contracts: (['name', 'symbol', 'decimals'] as const).map(fn => ({ address: addr, abi: erc20Abi, functionName: fn }))
    })
    const name = meta[0]!, sym = meta[1]!, decimals = meta[2]!
    const tokenName = name.status === 'success' ? String(name.result) : null
    const tokenSymbol = sym.status === 'success' ? String(sym.result) : null
    const lookalike = reg.tokens.find(t => tokenSymbol && t.symbol.toUpperCase() === tokenSymbol.toUpperCase())
    const claimsRobinhood = !!tokenName && /robinhood/i.test(tokenName)
    const risky = !!lookalike || claimsRobinhood || tokenSymbol?.toUpperCase() === 'USDG'
    return json({
      verdict: risky ? 'impersonation_risk' : 'unknown_token',
      address: addr,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: decimals.status === 'success' ? Number(decimals.result) : null,
      officialAddressForThisTicker: lookalike?.address ?? (tokenSymbol?.toUpperCase() === 'USDG' ? USDG.address : null),
      note: risky
        ? 'This contract uses an official ticker or the Robinhood name but is NOT created by the Robinhood StockFactory. Do not treat it as the real asset.'
        : 'Not a Robinhood stock token. ROUTIQ cannot vouch for it.',
      explorer: explorerAddress(addr)
    })
  }))

  server.registerTool('wallet_portfolio', {
    title: 'Wallet portfolio',
    description: 'ETH, USDG and official stock-token balances held by an address on Robinhood Chain. Amounts are in token units (no USD values yet).',
    inputSchema: { address: z.string().describe('Wallet address (0x…).') },
    annotations: READ_ONLY
  }, ({ address }) => withChain(async () => {
    if (!isAddress(address)) return fail('That is not a valid 0x address.')
    const addr = getAddress(address)
    const c = chainClient()
    const reg = await stockTokens()
    const tokens = [{ symbol: USDG.symbol, name: USDG.name, address: USDG.address, decimals: USDG.decimals }, ...reg.tokens.map(t => ({ ...t, decimals: 18 }))]
    const [eth, balances] = await Promise.all([
      c.getBalance({ address: addr }),
      c.multicall({ allowFailure: true, contracts: tokens.map(t => ({ address: t.address as Address, abi: erc20Abi, functionName: 'balanceOf' as const, args: [addr] as const })) })
    ])
    const holdings = tokens
      .map((t, i) => ({ t, r: balances[i]! }))
      .filter(({ r }) => r.status === 'success' && (r.result as bigint) > 0n)
      .map(({ t, r }) => ({ symbol: t.symbol, name: t.name, amount: trim(formatUnits(r.result as bigint, t.decimals)), address: t.address, kind: t.symbol === 'USDG' ? 'stablecoin' : 'stock_token' }))
    const failed = balances.filter(r => r.status !== 'success').length
    return json({
      address: addr,
      eth: trim(formatEther(eth)),
      holdings,
      tokensChecked: tokens.length,
      ...(failed ? { tokensUnreadable: failed } : {}),
      note: 'Only ETH, USDG and official Robinhood stock tokens are checked. USD values are not included yet.',
      explorer: explorerAddress(addr)
    })
  }))

  server.registerTool('tx_lookup', {
    title: 'Transaction lookup',
    description: 'Status, sender, recipient, ETH value, fee and decoded ERC-20 transfers of a Robinhood Chain transaction.',
    inputSchema: { hash: z.string().describe('Transaction hash (0x… 66 characters).') },
    annotations: READ_ONLY
  }, ({ hash }) => withChain(async () => {
    if (!isHash(hash)) return fail('That is not a valid transaction hash.')
    const c = chainClient()
    const [tx, receipt] = await Promise.all([c.getTransaction({ hash }), c.getTransactionReceipt({ hash })])
    const block = await c.getBlock({ blockNumber: receipt.blockNumber })
    const reg = await stockTokens()
    const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const raw = receipt.logs.filter(l => l.topics[0] === TRANSFER && l.topics.length === 3)
    const known = new Map<string, { symbol: string, decimals: number }>([[USDG.address, { symbol: 'USDG', decimals: 6 }], ...reg.tokens.map(t => [t.address, { symbol: t.symbol, decimals: 18 }] as [string, { symbol: string, decimals: number }])])
    const unknown = [...new Set(raw.map(l => getAddress(l.address)).filter(a => !known.has(a)))].slice(0, 10)
    if (unknown.length) {
      const meta = await c.multicall({ allowFailure: true, contracts: unknown.flatMap(a => [{ address: a, abi: erc20Abi, functionName: 'symbol' as const }, { address: a, abi: erc20Abi, functionName: 'decimals' as const }]) })
      unknown.forEach((a, i) => {
        const s = meta[i * 2]!, d = meta[i * 2 + 1]!
        known.set(a, { symbol: s.status === 'success' ? `${String(s.result)} (unverified)` : 'unknown', decimals: d.status === 'success' ? Number(d.result) : 18 })
      })
    }
    const transfers = raw.slice(0, 50).map((l) => {
      const token = getAddress(l.address)
      const meta = known.get(token) ?? { symbol: 'unknown', decimals: 18 }
      return { token, symbol: meta.symbol, from: getAddress(`0x${l.topics[1]!.slice(26)}`), to: getAddress(`0x${l.topics[2]!.slice(26)}`), amount: trim(formatUnits(BigInt(l.data), meta.decimals)) }
    })
    return json({
      hash,
      status: receipt.status,
      block: Number(receipt.blockNumber),
      time: new Date(Number(block.timestamp) * 1000).toISOString(),
      from: receipt.from,
      to: receipt.to,
      valueEth: trim(formatEther(tx.value)),
      feeEth: trim(formatEther(receipt.gasUsed * receipt.effectiveGasPrice), 10),
      transfers,
      ...(raw.length > 50 ? { transfersOmitted: raw.length - 50 } : {}),
      explorer: explorerTx(hash)
    })
  }))

  server.registerTool('market_hours', {
    title: 'US market hours',
    description: 'Whether the US stock exchange (NYSE/Nasdaq) is in its regular session, pre-market, after-hours or closed, and when it opens next. Useful because stock tokens keep trading 24/7.',
    inputSchema: { at: z.string().optional().describe('ISO time to check instead of now, e.g. "2026-12-24T18:00:00Z".') },
    annotations: { ...READ_ONLY, openWorldHint: false }
  }, ({ at }) => {
    const d = at ? new Date(at) : new Date()
    if (Number.isNaN(d.getTime())) return fail('Invalid time. Use ISO format, e.g. 2026-12-24T18:00:00Z.')
    return json(marketStatus(d))
  })

  // ---------------- Action tools ----------------
  const ACTION = { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const
  const addr = z.string().describe('0x address')

  server.registerTool('swap_quote', {
    title: 'Swap quote',
    description: 'Best price on Uniswap (Robinhood Chain) to swap between ETH, WETH, USDG and official Robinhood stock tokens. Tries direct pools and routes via USDG or WETH. Returns expected output and price impact. Read-only.',
    inputSchema: {
      sell: z.string().describe('Asset to sell: "ETH", "USDG", a stock ticker like "TSLA", or a token address.'),
      buy: z.string().describe('Asset to buy, same format.'),
      amount: z.string().describe('Amount of the sell asset in token units, e.g. "100" or "0.25".')
    },
    annotations: READ_ONLY
  }, ({ sell, buy, amount }) => withChain(async () => json((await swapQuote(sell, buy, amount)).summary)))

  server.registerTool('swap_build', {
    title: 'Build a swap',
    description: 'Build a Uniswap swap for the user on Robinhood Chain: adds an exact-amount approval if needed, sets a minimum output from the slippage limit, simulates everything, and returns a signUrl the user opens to review and sign in their own wallet. Nothing is sent by this tool. Stock-token swaps are only for users eligible in their jurisdiction.',
    inputSchema: {
      from: addr.describe('The user\'s wallet address (will sign and receive).'),
      sell: z.string().describe('Asset to sell: "ETH", "USDG", a stock ticker or token address.'),
      buy: z.string().describe('Asset to buy.'),
      amount: z.string().describe('Amount of the sell asset in token units.'),
      slippageBps: z.number().int().min(1).max(500).optional().describe('Max slippage in basis points (default 50 = 0.5%).')
    },
    annotations: ACTION
  }, (args) => withChain(async () => json(await buildSwap(args))))

  server.registerTool('transfer_build', {
    title: 'Build a transfer',
    description: 'Build a transfer of ETH, USDG or an official stock token from the user to a recipient. Checks balance, blocks sending to token contracts or the zero address, warns if the recipient is a contract, simulates, and returns a signUrl. Nothing is sent by this tool.',
    inputSchema: {
      from: addr.describe('Sender (the user\'s wallet).'),
      to: addr.describe('Recipient address.'),
      asset: z.string().describe('"ETH", "USDG", a stock ticker or token address.'),
      amount: z.string().describe('Amount in token units.')
    },
    annotations: ACTION
  }, (args) => withChain(async () => json(await buildTransfer(args))))

  server.registerTool('approvals_check', {
    title: 'Check approvals',
    description: 'List open token approvals (allowances) a wallet has given to Uniswap contracts, plus any extra spender addresses you pass. Flags unlimited approvals. Read-only.',
    inputSchema: {
      address: addr.describe('Wallet to check.'),
      spenders: z.array(z.string()).max(10).optional().describe('Extra spender contract addresses to check.')
    },
    annotations: READ_ONLY
  }, ({ address, spenders }) => withChain(async () => json(await checkApprovals(address, spenders ?? []))))

  server.registerTool('approval_revoke', {
    title: 'Revoke an approval',
    description: 'Build a transaction that sets a token approval to zero, simulate it, and return a signUrl. Nothing is sent by this tool.',
    inputSchema: {
      from: addr.describe('Wallet that gave the approval.'),
      token: z.string().describe('Token ticker or address (USDG, WETH or a stock token).'),
      spender: addr.describe('Contract that holds the approval.')
    },
    annotations: ACTION
  }, (args) => withChain(async () => json(await buildRevoke(args))))

  server.registerTool('tx_simulate', {
    title: 'Simulate a transaction',
    description: 'Simulate any transaction on Robinhood Chain without sending it: success or revert reason, gas used and decoded token transfers. Use before signing anything unfamiliar.',
    inputSchema: {
      from: addr.describe('Sender address.'),
      to: addr.describe('Target contract or wallet.'),
      data: z.string().optional().describe('Calldata (0x…). Omit for a plain ETH transfer.'),
      value: z.string().optional().describe('ETH value in wei (integer string).')
    },
    annotations: READ_ONLY
  }, (args) => withChain(async () => json(await simulateArbitrary(args))))

  return server
}
