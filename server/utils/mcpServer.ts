// ROUTIQ MCP server: read tools and action tools for Elysium (launch chain) and Robinhood Chain. Free during beta.
// Action tools never send anything: they return unsigned transactions and a /sign link for the user's own wallet.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { formatGwei, formatUnits, getAddress, isAddress, isHash, type Address } from 'viem'
import { z } from 'zod'
import { CHAINS, DEFAULT_CHAIN, STOCK_FACTORY, chainClient, erc20Abi, explorerAddress, explorerTx, stockTokens, type ChainKey } from './chain'
import { marketStatus } from './marketHours'
import { UserError, buildRevoke, buildSwap, buildTransfer, checkApprovals, knownAssets, simulateArbitrary, swapQuote } from './actions'

export const SERVER_INFO = { name: 'routiq', version: '0.3.0' }

export const TOOL_SUMMARY = [
  { name: 'chain_status', description: 'Latest block, gas price and average block time (Elysium or Robinhood Chain).' },
  { name: 'elysium_tokens', description: 'Tokens ROUTIQ supports on Elysium (HYPE, WHYPE, USDC and the most liquid Uniswap tokens).' },
  { name: 'stock_tokens', description: 'Search the official Robinhood stock-token registry (Robinhood Chain).' },
  { name: 'token_verify', description: 'Check a token address or ticker: listed/official, look-alike, or unknown.' },
  { name: 'wallet_portfolio', description: 'Native coin and supported token balances held by an address.' },
  { name: 'tx_lookup', description: 'Status, fee and decoded token transfers of a transaction.' },
  { name: 'market_hours', description: 'Whether the US stock exchange is open, and when it opens next.' },
  { name: 'swap_quote', description: 'Best Uniswap v3/v4 price between supported assets, with price impact.' },
  { name: 'swap_build', description: 'Build and simulate a swap; returns a sign link for the user\'s wallet.' },
  { name: 'transfer_build', description: 'Build and simulate a transfer; returns a sign link.' },
  { name: 'approvals_check', description: 'List token approvals a wallet has given to Uniswap contracts (and others you name).' },
  { name: 'approval_revoke', description: 'Build a transaction that revokes a token approval; returns a sign link.' },
  { name: 'tx_simulate', description: 'Simulate any transaction before signing: success, gas and token transfers.' }
]

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const
const ACTION = { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const
const json = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] })
const fail = (message: string) => ({ content: [{ type: 'text' as const, text: message }], isError: true })
const trim = (s: string, dp = 6) => (s.includes('.') ? s.replace(new RegExp(`(\\.\\d{0,${dp}})\\d*$`), '$1').replace(/\.?0+$/, '') : s)
const chainArg = z.enum(['elysium', 'robinhood']).optional()
  .describe('Chain: "elysium" (default — Kinetiq\'s Hyperliquid L2, chain ID 99901, gas in HYPE) or "robinhood" (Robinhood Chain, chain ID 4663, gas in ETH, stock tokens).')
const pick = (c?: ChainKey): ChainKey => c ?? DEFAULT_CHAIN
const ROUTIQ_NOTE = '$ROUTIQ launches on Elysium. The official address will be published only on https://www.routiq.tech and https://x.com/UseRoutiq. Any token using this ticker before then is not official.'

async function withChain<T>(key: ChainKey, fn: () => Promise<T>) {
  try { return await fn() } catch (err: any) {
    if (err instanceof UserError) return fail(err.message) as T
    const msg = String(err?.shortMessage || err?.message || err)
    return fail(`${CHAINS[key].name} RPC request failed: ${msg.slice(0, 300)}. Try again in a few seconds.`) as T
  }
}

export function createRoutiqServer() {
  const server = new McpServer(SERVER_INFO, {
    instructions: [
      'ROUTIQ gives agents tools for Elysium (default; Kinetiq\'s Hyperliquid L2, chain ID 99901, gas in HYPE) and Robinhood Chain (chain ID 4663, gas in ETH, Robinhood stock tokens). Pass chain: "robinhood" for Robinhood Chain.',
      'Action tools (swap_build, transfer_build, approval_revoke) never send anything: they simulate the transactions and return a signUrl. Give the user the signUrl so they can review and sign in their own wallet; never claim an action happened until the user confirms.',
      'On Elysium only HYPE, WHYPE, USDC and tokens from elysium_tokens are supported. On Robinhood Chain use stock_tokens / token_verify before trusting a stock-token address.',
      'Amounts are token units, not USD. Never ask for private keys. Stock-token eligibility depends on the user\'s jurisdiction; do not help bypass it.'
    ].join(' ')
  })

  server.registerTool('chain_status', {
    title: 'Chain status',
    description: 'Latest block number, block age, gas price (gwei) and average block time over the last 10,000 blocks.',
    inputSchema: { chain: chainArg },
    annotations: READ_ONLY
  }, ({ chain }) => { const key = pick(chain); return withChain(key, async () => {
    const cfg = CHAINS[key]
    const c = chainClient(key)
    const [latest, gasPrice] = await Promise.all([c.getBlock(), c.getGasPrice()])
    const span = 10_000n
    const past = await c.getBlock({ blockNumber: latest.number! - span })
    return json({
      chain: cfg.name,
      chainId: cfg.id,
      latestBlock: Number(latest.number),
      blockTime: new Date(Number(latest.timestamp) * 1000).toISOString(),
      blockAgeSeconds: Math.max(0, Math.round(Date.now() / 1000 - Number(latest.timestamp))),
      gasPriceGwei: Number(formatGwei(gasPrice)),
      gasToken: cfg.native.symbol,
      avgBlockTimeMs: Math.round(Number(latest.timestamp - past.timestamp) * 1000 / Number(span)),
      explorer: cfg.explorer
    })
  }) })

  server.registerTool('elysium_tokens', {
    title: 'Elysium token list',
    description: 'Tokens ROUTIQ supports on Elysium: HYPE (native gas), WHYPE, USDC and the most liquid tokens in hookless Uniswap pools. Search by symbol or name.',
    inputSchema: {
      query: z.string().max(64).optional().describe('Symbol or name filter. Leave empty to list all.'),
      limit: z.number().int().min(1).max(200).optional().describe('Maximum results (default 50).')
    },
    annotations: READ_ONLY
  }, async ({ query, limit }) => {
    const cfg = CHAINS.elysium
    const assets = await knownAssets('elysium')
    const all = [{ symbol: cfg.native.symbol, name: `${cfg.native.name} (native gas coin)`, address: null as string | null, decimals: 18, kind: 'native' }, ...assets]
    const q = query?.trim().toLowerCase()
    const list = q ? all.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)) : all
    return json({
      chain: cfg.name, chainId: cfg.id,
      total: all.length, matches: list.length,
      tokens: list.slice(0, limit ?? 50),
      note: 'Listed tokens come from hookless Uniswap pools with liquidity against HYPE or USDC. Listing is not an endorsement; always check what you buy.'
    })
  })

  server.registerTool('stock_tokens', {
    title: 'Stock token registry (Robinhood Chain)',
    description: 'Search official Robinhood stock tokens on Robinhood Chain by ticker or company name. The list is read from events of the Robinhood StockFactory contract, so look-alike tokens never appear here.',
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
      chain: 'Robinhood Chain',
      totalOfficialTokens: reg.tokens.length,
      matches: list.length,
      registryUpToDate: reg.live,
      factory: STOCK_FACTORY,
      tokens: list.slice(0, limit ?? 25).map(t => ({ ...t, decimals: 18, explorer: explorerAddress(t.address) }))
    })
  })

  server.registerTool('token_verify', {
    title: 'Token verifier',
    description: 'Check a token address or ticker. On Robinhood Chain: official stock token, USDG, look-alike, or unknown. On Elysium: a token on ROUTIQ\'s list, a look-alike of a listed ticker, or unknown.',
    inputSchema: {
      address: z.string().optional().describe('Token contract address (0x…).'),
      symbol: z.string().max(32).optional().describe('Ticker to look up, e.g. "AAPL" or "USDC".'),
      chain: chainArg
    },
    annotations: READ_ONLY
  }, ({ address, symbol, chain }) => { const key = pick(chain); return withChain(key, async () => {
    if (!address && !symbol) return fail('Provide an address or a symbol.')
    const cfg = CHAINS[key]
    const s = symbol?.trim().toUpperCase()
    if (s === 'ROUTIQ') return json({ verdict: 'not_launched', symbol: 'ROUTIQ', note: ROUTIQ_NOTE })

    if (key === 'elysium') {
      const assets = await knownAssets('elysium')
      if (!address) {
        if (s === cfg.native.symbol) return json({ verdict: 'native_coin', chain: cfg.name, symbol: s, note: 'HYPE is Elysium\'s native gas coin; it has no token contract.' })
        const hits = assets.filter(t => t.symbol.toUpperCase() === s)
        return json(hits.length
          ? { verdict: 'listed', chain: cfg.name, symbol: s, tokens: hits, warning: 'Other contracts may use the same ticker. Only the address above is on ROUTIQ\'s list.' }
          : { verdict: 'not_listed', chain: cfg.name, symbol: s, note: 'No token with this ticker is on ROUTIQ\'s Elysium list.' })
      }
      if (!isAddress(address)) return fail('That is not a valid 0x address.')
      const addr = getAddress(address)
      const listed = assets.find(t => t.address === addr)
      if (listed) return json({ verdict: 'listed', chain: cfg.name, ...listed })
      const c = chainClient(key)
      const code = await c.getCode({ address: addr })
      if (!code || code === '0x') return json({ verdict: 'not_a_contract', chain: cfg.name, address: addr, note: 'No contract code at this address (it may be a wallet).' })
      const meta = await c.multicall({ allowFailure: true, contracts: (['name', 'symbol', 'decimals'] as const).map(fn => ({ address: addr, abi: erc20Abi, functionName: fn })) })
      const tokenName = meta[0]!.status === 'success' ? String(meta[0]!.result) : null
      const tokenSymbol = meta[1]!.status === 'success' ? String(meta[1]!.result) : null
      const lookalike = assets.find(t => tokenSymbol && t.symbol.toUpperCase() === tokenSymbol.toUpperCase())
      const fakeRoutiq = tokenSymbol?.toUpperCase() === 'ROUTIQ' || /routiq/i.test(tokenName ?? '')
      return json({
        verdict: lookalike || fakeRoutiq ? 'impersonation_risk' : 'unknown_token',
        chain: cfg.name, address: addr, name: tokenName, symbol: tokenSymbol,
        decimals: meta[2]!.status === 'success' ? Number(meta[2]!.result) : null,
        listedAddressForThisTicker: lookalike?.address ?? null,
        note: fakeRoutiq ? ROUTIQ_NOTE : lookalike ? `This contract uses the ${tokenSymbol} ticker but is not the listed ${tokenSymbol}. Do not treat it as the real asset.` : 'Not on ROUTIQ\'s Elysium list. ROUTIQ cannot vouch for it.'
      })
    }

    // Robinhood Chain
    const reg = await stockTokens()
    const USDG = cfg.stable
    if (!address) {
      if (s === 'USDG') return json({ verdict: 'known_stablecoin', chain: cfg.name, ...USDG, note: 'Address from public developer docs; name and decimals confirmed on-chain.' })
      const hits = reg.tokens.filter(t => t.symbol.toUpperCase() === s)
      return json(hits.length
        ? { verdict: 'official_stock_token', chain: cfg.name, symbol: s, official: hits.map(t => ({ ...t, explorer: explorerAddress(t.address) })), warning: 'Any other contract using this ticker is NOT an official Robinhood stock token.' }
        : { verdict: 'not_listed', chain: cfg.name, symbol: s, note: 'No official Robinhood stock token uses this ticker. Treat tokens claiming it with caution.', ...(s && ['HYPE', 'WHYPE', 'KNTQ'].includes(s) ? { hint: `${s} lives on Elysium. Ask again with chain "elysium".` } : {}) })
    }
    if (!isAddress(address)) return fail('That is not a valid 0x address.')
    const addr = getAddress(address)
    const official = reg.tokens.find(t => t.address === addr)
    if (official) return json({ verdict: 'official_stock_token', chain: cfg.name, ...official, decimals: 18, explorer: explorerAddress(addr) })
    if (addr === USDG.address) return json({ verdict: 'known_stablecoin', chain: cfg.name, ...USDG, explorer: explorerAddress(addr) })
    const c = chainClient(key)
    const code = await c.getCode({ address: addr })
    if (!code || code === '0x') return json({ verdict: 'not_a_contract', chain: cfg.name, address: addr, note: 'No contract code at this address (it may be a wallet).' })
    const meta = await c.multicall({ allowFailure: true, contracts: (['name', 'symbol', 'decimals'] as const).map(fn => ({ address: addr, abi: erc20Abi, functionName: fn })) })
    const tokenName = meta[0]!.status === 'success' ? String(meta[0]!.result) : null
    const tokenSymbol = meta[1]!.status === 'success' ? String(meta[1]!.result) : null
    const lookalike = reg.tokens.find(t => tokenSymbol && t.symbol.toUpperCase() === tokenSymbol.toUpperCase())
    const claimsRobinhood = !!tokenName && /robinhood/i.test(tokenName)
    const fakeRoutiq = tokenSymbol?.toUpperCase() === 'ROUTIQ' || /routiq/i.test(tokenName ?? '')
    const risky = !!lookalike || claimsRobinhood || fakeRoutiq || tokenSymbol?.toUpperCase() === 'USDG'
    return json({
      verdict: risky ? 'impersonation_risk' : 'unknown_token',
      chain: cfg.name, address: addr, name: tokenName, symbol: tokenSymbol,
      decimals: meta[2]!.status === 'success' ? Number(meta[2]!.result) : null,
      officialAddressForThisTicker: lookalike?.address ?? (tokenSymbol?.toUpperCase() === 'USDG' ? USDG.address : null),
      note: risky
        ? (fakeRoutiq && !lookalike ? ROUTIQ_NOTE : 'This contract uses an official ticker or the Robinhood name but is NOT created by the Robinhood StockFactory. Do not treat it as the real asset.')
        : 'Not a Robinhood stock token. ROUTIQ cannot vouch for it.',
      explorer: explorerAddress(addr)
    })
  }) })

  server.registerTool('wallet_portfolio', {
    title: 'Wallet portfolio',
    description: 'Native coin plus supported token balances of an address. Elysium: HYPE, WHYPE, USDC and listed tokens. Robinhood Chain: ETH, USDG and official stock tokens. Amounts are token units (no USD values).',
    inputSchema: { address: z.string().describe('Wallet address (0x…).'), chain: chainArg },
    annotations: READ_ONLY
  }, ({ address, chain }) => { const key = pick(chain); return withChain(key, async () => {
    if (!isAddress(address)) return fail('That is not a valid 0x address.')
    const cfg = CHAINS[key]
    const addr = getAddress(address)
    const c = chainClient(key)
    const tokens = await knownAssets(key)
    const [nat, balances] = await Promise.all([
      c.getBalance({ address: addr }),
      c.multicall({ allowFailure: true, contracts: tokens.map(t => ({ address: t.address as Address, abi: erc20Abi, functionName: 'balanceOf' as const, args: [addr] as const })) })
    ])
    const holdings = tokens
      .map((t, i) => ({ t, r: balances[i]! }))
      .filter(({ r }) => r.status === 'success' && (r.result as bigint) > 0n)
      .map(({ t, r }) => ({ symbol: t.symbol, name: t.name, amount: trim(formatUnits(r.result as bigint, t.decimals)), address: t.address, kind: t.kind }))
    const failed = balances.filter(r => r.status !== 'success').length
    return json({
      chain: cfg.name,
      address: addr,
      native: { symbol: cfg.native.symbol, amount: trim(formatUnits(nat, 18)) },
      holdings,
      tokensChecked: tokens.length,
      ...(failed ? { tokensUnreadable: failed } : {}),
      note: `Only ${cfg.native.symbol} and ROUTIQ-supported tokens on ${cfg.name} are checked. USD values are not included.`,
      explorer: explorerAddress(addr, key)
    })
  }) })

  server.registerTool('tx_lookup', {
    title: 'Transaction lookup',
    description: 'Status, sender, recipient, native value, fee and decoded ERC-20 transfers of a transaction.',
    inputSchema: { hash: z.string().describe('Transaction hash (0x… 66 characters).'), chain: chainArg },
    annotations: READ_ONLY
  }, ({ hash, chain }) => { const key = pick(chain); return withChain(key, async () => {
    if (!isHash(hash)) return fail('That is not a valid transaction hash.')
    const cfg = CHAINS[key]
    const c = chainClient(key)
    const [tx, receipt] = await Promise.all([c.getTransaction({ hash }), c.getTransactionReceipt({ hash })])
    const block = await c.getBlock({ blockNumber: receipt.blockNumber })
    const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const raw = receipt.logs.filter(l => l.topics[0] === TRANSFER && l.topics.length === 3)
    const known = new Map<string, { symbol: string, decimals: number }>((await knownAssets(key)).map(t => [t.address, { symbol: t.symbol, decimals: t.decimals }]))
    const unknown = [...new Set(raw.map(l => getAddress(l.address)).filter(x => !known.has(x)))].slice(0, 10)
    if (unknown.length) {
      const meta = await c.multicall({ allowFailure: true, contracts: unknown.flatMap(x => [{ address: x, abi: erc20Abi, functionName: 'symbol' as const }, { address: x, abi: erc20Abi, functionName: 'decimals' as const }]) })
      unknown.forEach((x, i) => {
        const sy = meta[i * 2]!, d = meta[i * 2 + 1]!
        known.set(x, { symbol: sy.status === 'success' ? `${String(sy.result)} (unverified)` : 'unknown', decimals: d.status === 'success' ? Number(d.result) : 18 })
      })
    }
    const transfers = raw.slice(0, 50).map((l) => {
      const token = getAddress(l.address)
      const meta = known.get(token) ?? { symbol: 'unknown', decimals: 18 }
      return { token, symbol: meta.symbol, from: getAddress(`0x${l.topics[1]!.slice(26)}`), to: getAddress(`0x${l.topics[2]!.slice(26)}`), amount: trim(formatUnits(BigInt(l.data), meta.decimals)) }
    })
    return json({
      chain: cfg.name,
      hash,
      status: receipt.status,
      block: Number(receipt.blockNumber),
      time: new Date(Number(block.timestamp) * 1000).toISOString(),
      from: receipt.from,
      to: receipt.to,
      value: `${trim(formatUnits(tx.value, 18))} ${cfg.native.symbol}`,
      fee: `${trim(formatUnits(receipt.gasUsed * receipt.effectiveGasPrice, 18), 10)} ${cfg.native.symbol}`,
      transfers,
      ...(raw.length > 50 ? { transfersOmitted: raw.length - 50 } : {}),
      explorer: explorerTx(hash, key)
    })
  }) })

  server.registerTool('market_hours', {
    title: 'US market hours',
    description: 'Whether the US stock exchange (NYSE/Nasdaq) is in its regular session, pre-market, after-hours or closed, and when it opens next. Useful because Robinhood stock tokens keep trading 24/7.',
    inputSchema: { at: z.string().optional().describe('ISO time to check instead of now, e.g. "2026-12-24T18:00:00Z".') },
    annotations: { ...READ_ONLY, openWorldHint: false }
  }, ({ at }) => {
    const d = at ? new Date(at) : new Date()
    if (Number.isNaN(d.getTime())) return fail('Invalid time. Use ISO format, e.g. 2026-12-24T18:00:00Z.')
    return json(marketStatus(d))
  })

  // ---------------- Action tools ----------------
  const addr = z.string().describe('0x address')

  server.registerTool('swap_quote', {
    title: 'Swap quote',
    description: 'Best Uniswap price (v3 and hookless v4 pools, direct or via the stablecoin / native coin). Elysium: HYPE, WHYPE, USDC and listed tokens. Robinhood Chain: ETH, WETH, USDG and stock tokens. Returns expected output and price impact. Read-only.',
    inputSchema: {
      sell: z.string().describe('Asset to sell: symbol (e.g. "HYPE", "USDC", "TSLA") or token address.'),
      buy: z.string().describe('Asset to buy, same format.'),
      amount: z.string().describe('Amount of the sell asset in token units, e.g. "100" or "0.25".'),
      chain: chainArg
    },
    annotations: READ_ONLY
  }, ({ sell, buy, amount, chain }) => { const key = pick(chain); return withChain(key, async () => json((await swapQuote(key, sell, buy, amount)).summary)) })

  server.registerTool('swap_build', {
    title: 'Build a swap',
    description: 'Build a Uniswap swap for the user: adds exact-amount approvals only if needed, sets a minimum output from the slippage limit, simulates everything, and returns a signUrl the user opens to review and sign in their own wallet. Nothing is sent by this tool. Robinhood stock-token swaps are only for users eligible in their jurisdiction.',
    inputSchema: {
      from: addr.describe('The user\'s wallet address (will sign and receive).'),
      sell: z.string().describe('Asset to sell: symbol or token address.'),
      buy: z.string().describe('Asset to buy.'),
      amount: z.string().describe('Amount of the sell asset in token units.'),
      slippageBps: z.number().int().min(1).max(500).optional().describe('Max slippage in basis points (default 50 = 0.5%).'),
      chain: chainArg
    },
    annotations: ACTION
  }, ({ chain, ...args }) => { const key = pick(chain); return withChain(key, async () => json(await buildSwap(key, args))) })

  server.registerTool('transfer_build', {
    title: 'Build a transfer',
    description: 'Build a transfer of the native coin or a supported token from the user to a recipient. Checks balance, blocks sending to token contracts or the zero address, warns if the recipient is a contract, simulates, and returns a signUrl. Nothing is sent by this tool.',
    inputSchema: {
      from: addr.describe('Sender (the user\'s wallet).'),
      to: addr.describe('Recipient address.'),
      asset: z.string().describe('Symbol (e.g. "HYPE", "USDC", "ETH", "TSLA") or token address.'),
      amount: z.string().describe('Amount in token units.'),
      chain: chainArg
    },
    annotations: ACTION
  }, ({ chain, ...args }) => { const key = pick(chain); return withChain(key, async () => json(await buildTransfer(key, args))) })

  server.registerTool('approvals_check', {
    title: 'Check approvals',
    description: 'List open token approvals (allowances) a wallet has given to Uniswap contracts, plus any extra spender addresses you pass. Flags unlimited approvals. Read-only.',
    inputSchema: {
      address: addr.describe('Wallet to check.'),
      spenders: z.array(z.string()).max(10).optional().describe('Extra spender contract addresses to check.'),
      chain: chainArg
    },
    annotations: READ_ONLY
  }, ({ address, spenders, chain }) => { const key = pick(chain); return withChain(key, async () => json(await checkApprovals(key, address, spenders ?? []))) })

  server.registerTool('approval_revoke', {
    title: 'Revoke an approval',
    description: 'Build a transaction that sets a token approval to zero, simulate it, and return a signUrl. Nothing is sent by this tool.',
    inputSchema: {
      from: addr.describe('Wallet that gave the approval.'),
      token: z.string().describe('Token symbol or address.'),
      spender: addr.describe('Contract that holds the approval.'),
      chain: chainArg
    },
    annotations: ACTION
  }, ({ chain, ...args }) => { const key = pick(chain); return withChain(key, async () => json(await buildRevoke(key, args))) })

  server.registerTool('tx_simulate', {
    title: 'Simulate a transaction',
    description: 'Simulate any transaction without sending it: success or revert reason, gas used and decoded token and native transfers. Use before signing anything unfamiliar.',
    inputSchema: {
      from: addr.describe('Sender address.'),
      to: addr.describe('Target contract or wallet.'),
      data: z.string().optional().describe('Calldata (0x…). Omit for a plain native transfer.'),
      value: z.string().optional().describe('Native value in wei (integer string).'),
      chain: chainArg
    },
    annotations: READ_ONLY
  }, ({ chain, ...args }) => { const key = pick(chain); return withChain(key, async () => json(await simulateArbitrary(key, args))) })

  return server
}
