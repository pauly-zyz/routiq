// ROUTIQ action tools: quotes and unsigned transactions for Robinhood Chain.
// ROUTIQ never holds keys. Every action is returned as transactions + a /sign link the user signs in their own wallet.
import {
  concatHex, decodeAbiParameters, decodeFunctionData, encodeAbiParameters, encodeFunctionData, encodePacked, formatUnits,
  getAddress, isAddress, maxUint256, parseUnits, type Address, type Hex
} from 'viem'
import { USDG, chainClient, erc20Abi, stockTokens } from './chain'
import v4Snapshot from '../data/v4-pools.json'

// ---------- Contracts (Uniswap's official Robinhood Chain deployments, checked on-chain) ----------
export const UNI = {
  factory: getAddress('0x1f7d7550b1b028f7571e69a784071f0205fd2efa'),
  quoterV2: getAddress('0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7'),
  swapRouter02: getAddress('0xcaf681a66d020601342297493863e78c959e5cb2'),
  universalRouter: getAddress('0x8876789976decbfcbbbe364623c63652db8c0904'),
  permit2: getAddress('0x000000000022D473030F116dDEE9F6B43aC78BA3'),
  v4PositionManager: getAddress('0x58daec3116aae6d93017baaea7749052e8a04fa7'),
  v4Quoter: getAddress('0x8dc178efb8111bb0973dd9d722ebeff267c98f94')
}
const ZERO = '0x0000000000000000000000000000000000000000' as Address // native ETH in Uniswap v4
export const WETH = { symbol: 'WETH', name: 'Wrapped Ether', address: getAddress('0x0bd7d308f8e1639fab988df18a8011f41eacad73'), decimals: 18 }
const ROUTER_SELF = getAddress('0x0000000000000000000000000000000000000002') // SwapRouter02 "ADDRESS_THIS"
const FEES = [500, 3000, 10000, 100] as const
const SPENDER_NAMES: Record<string, string> = {
  [UNI.swapRouter02]: 'Uniswap SwapRouter02',
  [UNI.universalRouter]: 'Uniswap Universal Router',
  [UNI.permit2]: 'Uniswap Permit2',
  [UNI.v4PositionManager]: 'Uniswap v4 PositionManager'
}
const PERMIT2_MAX = 2n ** 159n
export const spenderName = (a: string) => SPENDER_NAMES[getAddress(a)] ?? null

// ---------- ABIs (quoter functions are marked view so they can be batched through eth_call) ----------
const quoterAbi = [
  { type: 'function', name: 'quoteExactInputSingle', stateMutability: 'view', inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'fee', type: 'uint24' }, { name: 'sqrtPriceLimitX96', type: 'uint160' }] }], outputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'sqrtPriceX96After', type: 'uint160' }, { name: 'ticks', type: 'uint32' }, { name: 'gasEstimate', type: 'uint256' }] },
  { type: 'function', name: 'quoteExactInput', stateMutability: 'view', inputs: [{ name: 'path', type: 'bytes' }, { name: 'amountIn', type: 'uint256' }], outputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'sqrts', type: 'uint160[]' }, { name: 'ticks', type: 'uint32[]' }, { name: 'gasEstimate', type: 'uint256' }] }
] as const

export const routerAbi = [
  { type: 'function', name: 'multicall', stateMutability: 'payable', inputs: [{ name: 'deadline', type: 'uint256' }, { name: 'data', type: 'bytes[]' }], outputs: [{ type: 'bytes[]' }] },
  { type: 'function', name: 'exactInputSingle', stateMutability: 'payable', inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'fee', type: 'uint24' }, { name: 'recipient', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMinimum', type: 'uint256' }, { name: 'sqrtPriceLimitX96', type: 'uint160' }] }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'exactInput', stateMutability: 'payable', inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'path', type: 'bytes' }, { name: 'recipient', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMinimum', type: 'uint256' }] }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'unwrapWETH9', stateMutability: 'payable', inputs: [{ name: 'amountMinimum', type: 'uint256' }, { name: 'recipient', type: 'address' }], outputs: [] }
] as const

const poolKeyTuple = { type: 'tuple', components: [{ name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' }, { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' }] } as const
const pathKeyArray = { type: 'tuple[]', components: [{ name: 'intermediateCurrency', type: 'address' }, { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' }, { name: 'hookData', type: 'bytes' }] } as const
const v4QuoterAbi = [
  { type: 'function', name: 'quoteExactInputSingle', stateMutability: 'view', inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'poolKey', ...poolKeyTuple }, { name: 'zeroForOne', type: 'bool' }, { name: 'exactAmount', type: 'uint128' }, { name: 'hookData', type: 'bytes' }] }], outputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'gasEstimate', type: 'uint256' }] },
  { type: 'function', name: 'quoteExactInput', stateMutability: 'view', inputs: [{ name: 'params', type: 'tuple', components: [{ name: 'exactCurrency', type: 'address' }, { name: 'path', ...pathKeyArray }, { name: 'exactAmount', type: 'uint128' }] }], outputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'gasEstimate', type: 'uint256' }] }
] as const
export const universalRouterAbi = [
  { type: 'function', name: 'execute', stateMutability: 'payable', inputs: [{ name: 'commands', type: 'bytes' }, { name: 'inputs', type: 'bytes[]' }, { name: 'deadline', type: 'uint256' }], outputs: [] }
] as const
export const permit2Abi = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'spender', type: 'address' }, { name: 'amount', type: 'uint160' }, { name: 'expiration', type: 'uint48' }], outputs: [] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'token', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: 'amount', type: 'uint160' }, { name: 'expiration', type: 'uint48' }, { name: 'nonce', type: 'uint48' }] }
] as const
// Universal Router V4_SWAP layouts used by the deployed router (verified by simulation on Robinhood Chain).
const V4_SINGLE = [{ type: 'tuple', components: [{ name: 'poolKey', ...poolKeyTuple }, { name: 'zeroForOne', type: 'bool' }, { name: 'amountIn', type: 'uint128' }, { name: 'amountOutMinimum', type: 'uint128' }, { name: 'minHopPriceX36', type: 'uint256' }, { name: 'hookData', type: 'bytes' }] }] as const
const V4_MULTI = [{ type: 'tuple', components: [{ name: 'currencyIn', type: 'address' }, { name: 'path', ...pathKeyArray }, { name: 'maxHopSlippage', type: 'uint256[]' }, { name: 'amountIn', type: 'uint128' }, { name: 'amountOutMinimum', type: 'uint128' }] }] as const
const CUR_AMOUNT = [{ type: 'address' }, { type: 'uint256' }] as const
const V4_SWAP = '0x10'
const ACT_SINGLE = '0x060c0f' // SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL
const ACT_MULTI = '0x070c0f'  // SWAP_EXACT_IN, SETTLE_ALL, TAKE_ALL

export const tokenWriteAbi = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] }
] as const

// ---------- Tokens ----------
export interface Asset { symbol: string, name: string, address: Address, decimals: number, kind: 'native' | 'stablecoin' | 'wrapped' | 'stock_token' | 'project' }
const ETH: Asset = { symbol: 'ETH', name: 'Ether', address: WETH.address, decimals: 18, kind: 'native' }

/** Assets the action tools may touch: ETH, WETH, USDG and official Robinhood stock tokens. */
export async function knownAssets(): Promise<Asset[]> {
  const reg = await stockTokens()
  return [
    { ...USDG, kind: 'stablecoin' },
    { ...WETH, kind: 'wrapped' },
    ...reg.tokens.map(t => ({ ...t, decimals: 18, kind: 'stock_token' as const }))
  ]
}

export async function resolveAsset(input: string): Promise<Asset> {
  const q = input.trim()
  if (q.toUpperCase() === 'ETH') return ETH
  const assets = await knownAssets()
  const hit = isAddress(q)
    ? assets.find(a => a.address === getAddress(q))
    : assets.find(a => a.symbol.toUpperCase() === q.toUpperCase())
  if (!hit) throw new UserError(`"${input}" is not supported. Use ETH, WETH, USDG or an official Robinhood stock token (see stock_tokens).`)
  return hit
}

export class UserError extends Error {}

export function parseAmount(amount: string, asset: Asset): bigint {
  const s = String(amount).trim().replace(/,/g, '')
  if (!/^\d+(\.\d+)?$/.test(s)) throw new UserError(`Invalid amount "${amount}". Use a plain number like 100 or 0.5.`)
  const [, frac = ''] = s.split('.')
  if (frac.length > asset.decimals) throw new UserError(`${asset.symbol} supports at most ${asset.decimals} decimals.`)
  const v = parseUnits(s, asset.decimals)
  if (v <= 0n) throw new UserError('Amount must be greater than zero.')
  return v
}

export const fmt = (v: bigint, decimals: number, dp = 6) => {
  const s = formatUnits(v, decimals)
  return s.includes('.') ? s.replace(new RegExp(`(\\.\\d{0,${dp}})\\d*$`), '$1').replace(/\.?0+$/, '') : s
}
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

async function balanceOf(owner: Address, asset: Asset) {
  const c = chainClient()
  if (asset.kind === 'native') return c.getBalance({ address: owner })
  return c.readContract({ address: asset.address, abi: erc20Abi, functionName: 'balanceOf', args: [owner] })
}

// ---------- Quotes ----------
interface PathKey { intermediateCurrency: Address, fee: number, tickSpacing: number, hooks: Address, hookData: Hex }
interface PoolKey { currency0: Address, currency1: Address, fee: number, tickSpacing: number, hooks: Address }
interface Route {
  version: 'v3' | 'v4'
  kind: 'single' | 'multi'
  tokens: Address[] // display path (v4 uses ZERO for native ETH)
  fees: number[]
  amountOut: bigint
  v4?: { key?: PoolKey, zeroForOne?: boolean, currencyIn: Address, path?: PathKey[] }
}

const pathOf = (tokens: Address[], fees: number[]) =>
  concatHex(tokens.flatMap((t, i) => (i < fees.length ? [t, encodePacked(['uint24'], [fees[i]!])] : [t])) as Hex[])

// v4 pool index from the snapshot (hookless, fee <= 1%), deepest pools first.
const V4_POOLS = new Map<string, { fee: number, tickSpacing: number, liquidity: bigint }[]>()
for (const [c0, c1, fee, ts, liq] of v4Snapshot.pools as [string, string, number, number, string][]) {
  const k = `${c0}|${c1}`
  if (!V4_POOLS.has(k)) V4_POOLS.set(k, [])
  V4_POOLS.get(k)!.push({ fee, tickSpacing: ts, liquidity: BigInt(liq) })
}
const sortPair = (a: Address, b: Address): [Address, Address] => (a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a])
const v4PoolsFor = (a: Address, b: Address, limit: number) => {
  const [c0, c1] = sortPair(a, b)
  return (V4_POOLS.get(`${c0.toLowerCase()}|${c1.toLowerCase()}`) ?? []).slice(0, limit).map(p => ({ ...p, c0: getAddress(c0), c1: getAddress(c1) }))
}
const v4Currency = (a: Asset): Address => (a.kind === 'native' ? ZERO : a.address)

async function bestV3(tokenIn: Address, tokenOut: Address, amountIn: bigint): Promise<Route | null> {
  const c = chainClient()
  const singles = FEES.map(fee => ({ tokens: [tokenIn, tokenOut], fees: [fee] }))
  const hubs = [USDG.address, WETH.address].filter(h => h !== tokenIn && h !== tokenOut)
  const multis = hubs.flatMap(h => [500, 3000].flatMap(f1 => [500, 3000].map(f2 => ({ tokens: [tokenIn, h, tokenOut], fees: [f1, f2] }))))
  const candidates = [...singles, ...multis]
  const res = await c.multicall({
    allowFailure: true,
    contracts: candidates.map(r => r.fees.length === 1
      ? { address: UNI.quoterV2, abi: quoterAbi, functionName: 'quoteExactInputSingle' as const, args: [{ tokenIn, tokenOut, amountIn, fee: r.fees[0]!, sqrtPriceLimitX96: 0n }] as const }
      : { address: UNI.quoterV2, abi: quoterAbi, functionName: 'quoteExactInput' as const, args: [pathOf(r.tokens, r.fees), amountIn] as const })
  })
  let best: Route | null = null
  res.forEach((r, i) => {
    if (r.status !== 'success') return
    const amountOut = (r.result as readonly [bigint, ...unknown[]])[0]
    const cand = candidates[i]!
    if (amountOut > 0n && (!best || amountOut > best.amountOut)) best = { version: 'v3', kind: cand.fees.length === 1 ? 'single' : 'multi', tokens: cand.tokens, fees: cand.fees, amountOut }
  })
  return best
}

async function bestV4(cin: Address, cout: Address, amountIn: bigint): Promise<Route | null> {
  if (amountIn >= 2n ** 128n) return null
  const singles = v4PoolsFor(cin, cout, 6).map(p => ({ kind: 'single' as const, p }))
  const hubs = [ZERO, USDG.address].filter(h => h !== cin && h !== cout)
  const multis = hubs.flatMap(h => v4PoolsFor(cin, h, 3).flatMap(a => v4PoolsFor(h, cout, 3).map(b => ({ kind: 'multi' as const, h, a, b }))))
  if (!singles.length && !multis.length) return null
  const res = await chainClient().multicall({
    allowFailure: true,
    contracts: [
      ...singles.map(({ p }) => ({
        address: UNI.v4Quoter, abi: v4QuoterAbi, functionName: 'quoteExactInputSingle' as const,
        args: [{ poolKey: { currency0: p.c0, currency1: p.c1, fee: p.fee, tickSpacing: p.tickSpacing, hooks: ZERO }, zeroForOne: p.c0 === cin, exactAmount: amountIn, hookData: '0x' as Hex }] as const
      })),
      ...multis.map(m => ({
        address: UNI.v4Quoter, abi: v4QuoterAbi, functionName: 'quoteExactInput' as const,
        args: [{ exactCurrency: cin, exactAmount: amountIn, path: [
          { intermediateCurrency: m.h, fee: m.a.fee, tickSpacing: m.a.tickSpacing, hooks: ZERO, hookData: '0x' as Hex },
          { intermediateCurrency: cout, fee: m.b.fee, tickSpacing: m.b.tickSpacing, hooks: ZERO, hookData: '0x' as Hex }
        ] }] as const
      }))
    ]
  })
  let best: Route | null = null
  res.forEach((r, i) => {
    if (r.status !== 'success') return
    const amountOut = (r.result as readonly [bigint, bigint])[0]
    if (amountOut <= 0n || (best && amountOut <= best.amountOut)) return
    if (i < singles.length) {
      const p = singles[i]!.p
      best = { version: 'v4', kind: 'single', tokens: [cin, cout], fees: [p.fee], amountOut, v4: { currencyIn: cin, key: { currency0: p.c0, currency1: p.c1, fee: p.fee, tickSpacing: p.tickSpacing, hooks: ZERO }, zeroForOne: p.c0 === cin } }
    } else {
      const m = multis[i - singles.length]!
      best = { version: 'v4', kind: 'multi', tokens: [cin, m.h, cout], fees: [m.a.fee, m.b.fee], amountOut, v4: { currencyIn: cin, path: [
        { intermediateCurrency: m.h, fee: m.a.fee, tickSpacing: m.a.tickSpacing, hooks: ZERO, hookData: '0x' },
        { intermediateCurrency: cout, fee: m.b.fee, tickSpacing: m.b.tickSpacing, hooks: ZERO, hookData: '0x' }
      ] } }
    }
  })
  return best
}

/** Best of Uniswap v3 and v4 (hookless pools only). */
async function bestRoute(tin: Asset, tout: Asset, amountIn: bigint) {
  const [v3, v4] = await Promise.all([
    bestV3(tin.address, tout.address, amountIn).catch(() => null),
    bestV4(v4Currency(tin), v4Currency(tout), amountIn).catch(() => null)
  ])
  const best = !v3 ? v4 : !v4 ? v3 : (v4.amountOut > v3.amountOut ? v4 : v3)
  return { best, v3, v4 }
}

export async function swapQuote(tokenInInput: string, tokenOutInput: string, amountInput: string) {
  const tin = await resolveAsset(tokenInInput)
  const tout = await resolveAsset(tokenOutInput)
  if (tin.address === tout.address && tin.kind === tout.kind) throw new UserError('Pick two different assets.')
  if ((tin.kind === 'native' && tout.kind === 'wrapped') || (tin.kind === 'wrapped' && tout.kind === 'native')) throw new UserError('ETH ↔ WETH is a wrap, not a swap. Pick another pair.')
  const amountIn = parseAmount(amountInput, tin)
  const { best: route, v3, v4 } = await bestRoute(tin, tout, amountIn)
  if (!route) throw new UserError(`No Uniswap liquidity found for ${tin.symbol} → ${tout.symbol}.`)
  // Price impact: compare with a quote for 1/1000 of the size.
  const small = amountIn / 1000n > 0n ? amountIn / 1000n : 1n
  const ref = (await bestRoute(tin, tout, small)).best
  let impactPct: number | null = null
  if (ref && ref.amountOut > 0n) {
    const refRate = Number(ref.amountOut) / Number(small)
    const rate = Number(route.amountOut) / Number(amountIn)
    impactPct = Math.max(0, (1 - rate / refRate) * 100)
  }
  const assets = await knownAssets()
  const sym = (a: Address) => {
    if (a === ZERO) return 'ETH'
    if (a === WETH.address) return (a === tin.address && tin.kind === 'native') || (a === tout.address && tout.kind === 'native') ? 'ETH' : 'WETH'
    return assets.find(x => x.address === a)?.symbol ?? short(a)
  }
  const outHuman = Number(formatUnits(route.amountOut, tout.decimals))
  const inHuman = Number(formatUnits(amountIn, tin.decimals))
  const other = route === v4 ? v3 : v4
  return {
    tin, tout, amountIn, route,
    summary: {
      sell: `${fmt(amountIn, tin.decimals)} ${tin.symbol}`,
      buy: `${fmt(route.amountOut, tout.decimals)} ${tout.symbol}`,
      price: `1 ${tin.symbol} ≈ ${(outHuman / inHuman).toPrecision(6)} ${tout.symbol}`,
      inversePrice: `1 ${tout.symbol} ≈ ${(inHuman / outHuman).toPrecision(6)} ${tin.symbol}`,
      priceImpactPct: impactPct === null ? null : Number(impactPct.toFixed(3)),
      route: route.tokens.map(sym).join(' → '),
      poolFees: route.fees.map(f => `${f / 10_000}%`),
      venue: `Uniswap ${route.version} on Robinhood Chain`,
      comparedWith: other ? `Uniswap ${other.version}: ${fmt(other.amountOut, tout.decimals)} ${tout.symbol}` : `no Uniswap ${route.version === 'v3' ? 'v4' : 'v3'} route`
    }
  }
}

// ---------- Simulation ----------
export interface Tx { to: Address, data: Hex, value: string, label: string }
interface SimResult { ok: boolean, steps: { label: string, ok: boolean, gasUsed: number, error?: string }[], error?: string, logs: any[] }

export async function simulate(from: Address, txs: Tx[]): Promise<SimResult> {
  const c = chainClient()
  try {
    const res = await c.request({
      method: 'eth_simulateV1' as any,
      params: [{ blockStateCalls: [{ calls: txs.map(t => ({ from, to: t.to, data: t.data, value: `0x${BigInt(t.value).toString(16)}` })) }], validation: false, traceTransfers: true }, 'latest'] as any
    }) as any[]
    const calls = res[0]?.calls ?? []
    const steps = txs.map((t, i) => {
      const r = calls[i] ?? {}
      const ok = r.status === '0x1'
      return { label: t.label, ok, gasUsed: Number(BigInt(r.gasUsed ?? '0x0')), ...(ok ? {} : { error: r.error?.message || 'reverted' }) }
    })
    return { ok: steps.every(s => s.ok), steps, logs: calls.flatMap((r: any) => r.logs ?? []) }
  } catch (err: any) {
    const msg = String(err?.details || err?.shortMessage || err?.message || err).slice(0, 200)
    return { ok: false, steps: txs.map(t => ({ label: t.label, ok: false, gasUsed: 0, error: msg })), error: msg, logs: [] }
  }
}

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const WITHDRAWAL_TOPIC = '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65'
const NATIVE_PSEUDO = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

async function feeEstimate(gas: number) {
  const gp = await chainClient().getGasPrice()
  return `${fmt(gp * BigInt(Math.ceil(gas * 1.2)), 18, 8)} ETH`
}

// ---------- Sign links ----------
export function signUrl(from: Address, txs: Tx[], ttlSeconds = 15 * 60) {
  const base = String(useRuntimeConfig().public.siteUrl || 'https://www.routiq.tech').replace(/\/$/, '')
  const payload = { v: 1, c: 4663, f: from, e: Math.floor(Date.now() / 1000) + ttlSeconds, t: txs.map(t => [t.to, t.data, t.value]) }
  return `${base}/sign#${Buffer.from(JSON.stringify(payload)).toString('base64url')}`
}

// ---------- Builders ----------
function requireAddress(a: string, what: string): Address {
  if (!isAddress(a)) throw new UserError(`${what} is not a valid 0x address.`)
  return getAddress(a)
}

export async function buildSwap(opts: { from: string, sell: string, buy: string, amount: string, slippageBps?: number }) {
  const from = requireAddress(opts.from, 'from')
  const slippageBps = Math.min(Math.max(Math.round(opts.slippageBps ?? 50), 1), 500)
  const q = await swapQuote(opts.sell, opts.buy, opts.amount)
  const { tin, tout, amountIn, route } = q
  const bal = await balanceOf(from, tin)
  if (bal < amountIn) throw new UserError(`Not enough ${tin.symbol}: wallet has ${fmt(bal, tin.decimals)}, swap needs ${fmt(amountIn, tin.decimals)}.`)

  const minOut = route.amountOut * BigInt(10_000 - slippageBps) / 10_000n
  const ethOut = tout.kind === 'native'
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60)
  const swapLabel = `Swap ${fmt(amountIn, tin.decimals)} ${tin.symbol} → at least ${fmt(minOut, tout.decimals)} ${tout.symbol} on Uniswap ${route.version}`
  const c = chainClient()
  const txs: Tx[] = []

  if (route.version === 'v3') {
    const recipient = ethOut ? ROUTER_SELF : from
    const inner: Hex[] = [route.kind === 'single'
      ? encodeFunctionData({ abi: routerAbi, functionName: 'exactInputSingle', args: [{ tokenIn: route.tokens[0]!, tokenOut: route.tokens[1]!, fee: route.fees[0]!, recipient, amountIn, amountOutMinimum: minOut, sqrtPriceLimitX96: 0n }] })
      : encodeFunctionData({ abi: routerAbi, functionName: 'exactInput', args: [{ path: pathOf(route.tokens, route.fees), recipient, amountIn, amountOutMinimum: minOut }] })]
    if (ethOut) inner.push(encodeFunctionData({ abi: routerAbi, functionName: 'unwrapWETH9', args: [minOut, from] }))
    if (tin.kind !== 'native') {
      const allowance = await c.readContract({ address: tin.address, abi: tokenWriteAbi, functionName: 'allowance', args: [from, UNI.swapRouter02] })
      if (allowance < amountIn) txs.push({ to: tin.address, data: encodeFunctionData({ abi: tokenWriteAbi, functionName: 'approve', args: [UNI.swapRouter02, amountIn] }), value: '0', label: `Approve ${fmt(amountIn, tin.decimals)} ${tin.symbol} for Uniswap SwapRouter02 (exact amount)` })
    }
    txs.push({ to: UNI.swapRouter02, data: encodeFunctionData({ abi: routerAbi, functionName: 'multicall', args: [deadline, inner] }), value: tin.kind === 'native' ? amountIn.toString() : '0', label: swapLabel })
  } else {
    const v4 = route.v4!
    const cin = v4.currencyIn
    const cout = route.tokens[route.tokens.length - 1]!
    const swapParams = route.kind === 'single'
      ? encodeAbiParameters(V4_SINGLE, [{ poolKey: v4.key!, zeroForOne: v4.zeroForOne!, amountIn, amountOutMinimum: minOut, minHopPriceX36: 0n, hookData: '0x' }])
      : encodeAbiParameters(V4_MULTI, [{ currencyIn: cin, path: v4.path!, maxHopSlippage: [], amountIn, amountOutMinimum: minOut }])
    const input = encodeAbiParameters([{ type: 'bytes' }, { type: 'bytes[]' }], [
      route.kind === 'single' ? ACT_SINGLE : ACT_MULTI,
      [swapParams, encodeAbiParameters(CUR_AMOUNT, [cin, amountIn]), encodeAbiParameters(CUR_AMOUNT, [cout, minOut])]
    ])
    if (tin.kind !== 'native') {
      // Universal Router pulls tokens through Permit2: exact ERC-20 approval to Permit2, then a short-lived Permit2 allowance.
      const [erc20Allowance, p2] = await Promise.all([
        c.readContract({ address: tin.address, abi: tokenWriteAbi, functionName: 'allowance', args: [from, UNI.permit2] }),
        c.readContract({ address: UNI.permit2, abi: permit2Abi, functionName: 'allowance', args: [from, tin.address, UNI.universalRouter] })
      ])
      if (erc20Allowance < amountIn) txs.push({ to: tin.address, data: encodeFunctionData({ abi: tokenWriteAbi, functionName: 'approve', args: [UNI.permit2, amountIn] }), value: '0', label: `Approve ${fmt(amountIn, tin.decimals)} ${tin.symbol} for Uniswap Permit2 (exact amount)` })
      const now = Math.floor(Date.now() / 1000)
      if (p2[0] < amountIn || p2[1] < now + 60) {
        const expiration = now + 30 * 60
        txs.push({ to: UNI.permit2, data: encodeFunctionData({ abi: permit2Abi, functionName: 'approve', args: [tin.address, UNI.universalRouter, amountIn, expiration] }), value: '0', label: `Let Uniswap Universal Router use ${fmt(amountIn, tin.decimals)} ${tin.symbol} via Permit2 (expires in 30 min)` })
      }
    }
    txs.push({ to: UNI.universalRouter, data: encodeFunctionData({ abi: universalRouterAbi, functionName: 'execute', args: [V4_SWAP, [input], deadline] }), value: tin.kind === 'native' ? amountIn.toString() : '0', label: swapLabel })
  }

  const sim = await simulate(from, txs)
  // Amount actually received in the simulation.
  let simulatedOut: string | null = null
  if (sim.ok) {
    const fromTopic = from.toLowerCase().slice(2)
    if (ethOut) {
      // With traceTransfers, native ETH moves appear as Transfer logs from the 0xEeee… pseudo-address.
      const eth = sim.logs.filter((l: any) => l.address?.toLowerCase() === NATIVE_PSEUDO && l.topics?.[0] === TRANSFER_TOPIC && l.topics?.[2]?.toLowerCase().endsWith(fromTopic))
      const w = sim.logs.find((l: any) => getAddress(l.address) === WETH.address && l.topics?.[0] === WITHDRAWAL_TOPIC)
      if (eth.length) simulatedOut = `${fmt(eth.reduce((t: bigint, l: any) => t + BigInt(l.data), 0n), 18)} ETH`
      else if (w) simulatedOut = `${fmt(BigInt(w.data), 18)} ETH`
    } else {
      const tr = sim.logs.filter((l: any) => getAddress(l.address) === tout.address && l.topics?.[0] === TRANSFER_TOPIC && l.topics?.[2]?.toLowerCase().endsWith(fromTopic))
      if (tr.length) simulatedOut = `${fmt(tr.reduce((s: bigint, l: any) => s + BigInt(l.data), 0n), tout.decimals)} ${tout.symbol}`
    }
  }
  const gas = sim.steps.reduce((s, x) => s + x.gasUsed, 0)
  return {
    action: 'swap',
    quote: q.summary,
    slippage: `${slippageBps / 100}%`,
    minimumReceived: `${fmt(minOut, tout.decimals)} ${tout.symbol}`,
    simulation: { ok: sim.ok, simulatedReceive: simulatedOut, steps: sim.steps, ...(sim.error ? { error: sim.error } : {}) },
    estimatedNetworkFee: gas ? await feeEstimate(gas) : null,
    involvesStockToken: tin.kind === 'stock_token' || tout.kind === 'stock_token',
    signUrl: signUrl(from, txs),
    transactions: txs.map(t => ({ ...t, from, chainId: 4663 })),
    note: 'Nothing has been sent. The user must open signUrl (or send these transactions from their own wallet) to execute. Quote valid ~20 minutes.'
  }
}

export async function buildTransfer(opts: { from: string, to: string, asset: string, amount: string }) {
  const from = requireAddress(opts.from, 'from')
  const to = requireAddress(opts.to, 'to')
  const asset = await resolveAsset(opts.asset)
  const amount = parseAmount(opts.amount, asset)
  if (to === from) throw new UserError('Recipient is the same as the sender.')
  if (to === '0x0000000000000000000000000000000000000000') throw new UserError('Refusing to send to the zero address.')
  const assets = await knownAssets()
  if (assets.some(a => a.address === to)) throw new UserError('The recipient is a token contract. Tokens sent there are usually lost forever.')
  const bal = await balanceOf(from, asset)
  if (bal < amount) throw new UserError(`Not enough ${asset.symbol}: wallet has ${fmt(bal, asset.decimals)}, transfer needs ${fmt(amount, asset.decimals)}.`)

  const code = await chainClient().getCode({ address: to })
  const warnings: string[] = []
  if (code && code !== '0x') warnings.push('The recipient is a smart contract, not a plain wallet. Make sure it can receive this asset.')

  const tx: Tx = asset.kind === 'native'
    ? { to, data: '0x', value: amount.toString(), label: `Send ${fmt(amount, 18)} ETH to ${to}` }
    : { to: asset.address, data: encodeFunctionData({ abi: tokenWriteAbi, functionName: 'transfer', args: [to, amount] }), value: '0', label: `Send ${fmt(amount, asset.decimals)} ${asset.symbol} to ${to}` }
  const sim = await simulate(from, [tx])
  const gas = sim.steps[0]?.gasUsed ?? 0
  return {
    action: 'transfer',
    send: `${fmt(amount, asset.decimals)} ${asset.symbol}`,
    to,
    warnings,
    simulation: { ok: sim.ok, steps: sim.steps, ...(sim.error ? { error: sim.error } : {}) },
    estimatedNetworkFee: gas ? await feeEstimate(gas) : null,
    involvesStockToken: asset.kind === 'stock_token',
    signUrl: signUrl(from, [tx]),
    transactions: [{ ...tx, from, chainId: 4663 }],
    note: 'Nothing has been sent. Double-check the recipient address before signing — transfers cannot be undone.'
  }
}

export async function checkApprovals(ownerInput: string, extraSpenders: string[] = []) {
  const owner = requireAddress(ownerInput, 'address')
  const spenders = [...new Set([...Object.keys(SPENDER_NAMES), ...extraSpenders.filter(a => isAddress(a)).map(a => getAddress(a))])] as Address[]
  const assets = await knownAssets()
  const pairs = assets.flatMap(a => spenders.map(s => ({ a, s })))
  const res = await chainClient().multicall({
    allowFailure: true,
    contracts: pairs.map(p => ({ address: p.a.address, abi: tokenWriteAbi, functionName: 'allowance' as const, args: [owner, p.s] as const }))
  })
  const approvals = pairs
    .map((p, i) => ({ p, r: res[i]! }))
    .filter(({ r }) => r.status === 'success' && (r.result as bigint) > 0n)
    .map(({ p, r }) => {
      const v = r.result as bigint
      return {
        token: p.a.symbol, tokenAddress: p.a.address, spender: p.s, spenderName: spenderName(p.s) ?? 'unknown contract',
        allowance: v >= maxUint256 / 2n ? 'unlimited' : fmt(v, p.a.decimals),
        risk: v >= maxUint256 / 2n ? 'high — unlimited approval' : 'limited'
      }
    })
  return {
    owner,
    approvals,
    checked: { tokens: assets.length, spenders: spenders.map(s => ({ address: s, name: spenderName(s) ?? 'custom' })) },
    note: approvals.length ? 'Use approval_revoke to remove any approval you no longer need.' : 'No open approvals found for the checked spenders.'
  }
}

export async function buildRevoke(opts: { from: string, token: string, spender: string }) {
  const from = requireAddress(opts.from, 'from')
  const spender = requireAddress(opts.spender, 'spender')
  const asset = await resolveAsset(opts.token)
  if (asset.kind === 'native') throw new UserError('ETH has no approvals. Pick a token.')
  const current = await chainClient().readContract({ address: asset.address, abi: tokenWriteAbi, functionName: 'allowance', args: [from, spender] })
  if (current === 0n) throw new UserError(`There is no ${asset.symbol} approval for ${spender} to revoke.`)
  const tx: Tx = { to: asset.address, data: encodeFunctionData({ abi: tokenWriteAbi, functionName: 'approve', args: [spender, 0n] }), value: '0', label: `Revoke ${asset.symbol} approval for ${spenderName(spender) ?? spender}` }
  const sim = await simulate(from, [tx])
  return {
    action: 'revoke_approval',
    token: asset.symbol,
    spender, spenderName: spenderName(spender) ?? 'unknown contract',
    currentAllowance: current >= maxUint256 / 2n ? 'unlimited' : fmt(current, asset.decimals),
    simulation: { ok: sim.ok, steps: sim.steps },
    signUrl: signUrl(from, [tx]),
    transactions: [{ ...tx, from, chainId: 4663 }]
  }
}

export async function simulateArbitrary(opts: { from: string, to: string, data?: string, value?: string }) {
  const from = requireAddress(opts.from, 'from')
  const to = requireAddress(opts.to, 'to')
  const data = (opts.data && /^0x[0-9a-fA-F]*$/.test(opts.data) ? opts.data : '0x') as Hex
  const value = opts.value && /^\d+$/.test(opts.value) ? opts.value : '0'
  const sim = await simulate(from, [{ to, data, value, label: 'transaction' }])
  const assets = await knownAssets()
  const transfers = sim.logs
    .filter((l: any) => l.topics?.[0] === TRANSFER_TOPIC && l.topics.length === 3)
    .map((l: any) => {
      if (l.address?.toLowerCase() === NATIVE_PSEUDO) return { token: 'ETH', from: getAddress(`0x${l.topics[1].slice(26)}`), to: getAddress(`0x${l.topics[2].slice(26)}`), amount: fmt(BigInt(l.data), 18) }
      const a = assets.find(x => x.address === getAddress(l.address))
      return { token: a?.symbol ?? getAddress(l.address), from: getAddress(`0x${l.topics[1].slice(26)}`), to: getAddress(`0x${l.topics[2].slice(26)}`), amount: a ? fmt(BigInt(l.data), a.decimals) : BigInt(l.data).toString() }
    })
  return { from, to, success: sim.ok, gasUsed: sim.steps[0]?.gasUsed ?? 0, ...(sim.steps[0]?.error ? { error: sim.steps[0].error } : {}), tokenTransfers: transfers.slice(0, 30), note: 'Simulation only — nothing was sent.' }
}

// ---------- Inspecting a sign link (used by /sign) ----------
// The sign page never trusts text from the link. It decodes each call itself and only accepts the actions ROUTIQ builds.
export async function inspectPayload(raw: unknown) {
  const p = raw as { v?: number, c?: number, f?: string, e?: number, t?: [string, string, string][] }
  if (!p || p.v !== 1 || p.c !== 4663 || !p.f || !Array.isArray(p.t) || !p.t.length || p.t.length > 5) throw new UserError('This link is malformed.')
  const from = requireAddress(p.f, 'from')
  const expired = typeof p.e === 'number' && p.e * 1000 < Date.now()
  const assets = await knownAssets()
  const byAddr = new Map(assets.map(a => [a.address, a]))
  const steps: { title: string, detail: string }[] = []
  const txs: Tx[] = []
  let involvesStockToken = false

  for (const [toRaw, dataRaw, valueRaw] of p.t) {
    const to = requireAddress(toRaw, 'to')
    const data = (typeof dataRaw === 'string' && /^0x[0-9a-fA-F]*$/.test(dataRaw) ? dataRaw : null) as Hex | null
    if (!data || !/^\d+$/.test(String(valueRaw))) throw new UserError('This link contains an invalid transaction.')
    const value = BigInt(valueRaw)
    const token = byAddr.get(to)

    if (data === '0x') {
      if (value <= 0n || token) throw new UserError('This link contains a transaction ROUTIQ does not build.')
      steps.push({ title: `Send ${fmt(value, 18)} ETH`, detail: `to ${to}` })
    } else if (token) {
      if (value !== 0n) throw new UserError('Unexpected ETH value on a token call.')
      const d = decodeFunctionData({ abi: tokenWriteAbi, data })
      if (token.kind === 'stock_token') involvesStockToken = true
      if (d.functionName === 'transfer') {
        const [rcpt, amt] = d.args as [Address, bigint]
        steps.push({ title: `Send ${fmt(amt, token.decimals)} ${token.symbol}`, detail: `to ${rcpt}` })
      } else if (d.functionName === 'approve') {
        const [spender, amt] = d.args as [Address, bigint]
        if (amt === 0n) steps.push({ title: `Revoke ${token.symbol} approval`, detail: `for ${spenderName(spender) ?? spender}` })
        else if ((spender === UNI.swapRouter02 || spender === UNI.permit2) && amt < maxUint256 / 2n) steps.push({ title: `Approve ${fmt(amt, token.decimals)} ${token.symbol}`, detail: `for ${spenderName(spender)} — exact amount only` })
        else throw new UserError('This link asks for a token approval ROUTIQ never creates.')
      } else throw new UserError('This link contains a call ROUTIQ does not build.')
    } else if (to === UNI.permit2) {
      if (value !== 0n) throw new UserError('Unexpected ETH value on a Permit2 call.')
      const d = decodeFunctionData({ abi: permit2Abi, data })
      if (d.functionName !== 'approve') throw new UserError('Unexpected Permit2 call.')
      const [tok, spender, amt, expiration] = d.args as [Address, Address, bigint, number]
      const t = byAddr.get(getAddress(tok))
      if (!t || getAddress(spender) !== UNI.universalRouter) throw new UserError('This link asks for a Permit2 allowance ROUTIQ never creates.')
      if (amt === 0n) steps.push({ title: `Revoke ${t.symbol} Permit2 allowance`, detail: 'for Uniswap Universal Router' })
      else {
        if (amt >= PERMIT2_MAX || Number(expiration) > Math.floor(Date.now() / 1000) + 86_400) throw new UserError('This link asks for an unlimited or long-lived Permit2 allowance.')
        steps.push({ title: `Allow ${fmt(amt, t.decimals)} ${t.symbol} for Uniswap Universal Router`, detail: `via Permit2 · expires ${new Date(Number(expiration) * 1000).toISOString().slice(11, 16)} UTC` })
      }
      if (t.kind === 'stock_token') involvesStockToken = true
    } else if (to === UNI.universalRouter) {
      const outer = decodeFunctionData({ abi: universalRouterAbi, data })
      const [commands, inputs, deadline] = outer.args as [Hex, Hex[], bigint]
      if (commands.toLowerCase() !== V4_SWAP || inputs.length !== 1) throw new UserError('This router call does more than a single v4 swap.')
      const [actions, params] = decodeAbiParameters([{ type: 'bytes' }, { type: 'bytes[]' }], inputs[0]!) as [Hex, Hex[]]
      const act = actions.toLowerCase()
      if ((act !== ACT_SINGLE && act !== ACT_MULTI) || params.length !== 3) throw new UserError('This v4 swap uses actions ROUTIQ does not build.')
      let cin: Address, cout: Address, amountIn: bigint, minOut: bigint
      const cur = (a: Address) => (getAddress(a) === ZERO ? { symbol: 'ETH', decimals: 18, kind: 'native' } : byAddr.get(getAddress(a)))
      if (act === ACT_SINGLE) {
        const [sp] = decodeAbiParameters(V4_SINGLE, params[0]!) as any
        if (getAddress(sp.poolKey.hooks) !== ZERO) throw new UserError('This swap uses a pool with hooks.')
        cin = getAddress(sp.zeroForOne ? sp.poolKey.currency0 : sp.poolKey.currency1)
        cout = getAddress(sp.zeroForOne ? sp.poolKey.currency1 : sp.poolKey.currency0)
        amountIn = sp.amountIn; minOut = sp.amountOutMinimum
      } else {
        const [mp] = decodeAbiParameters(V4_MULTI, params[0]!) as any
        if (mp.path.length < 1 || mp.path.length > 3 || mp.path.some((k: any) => getAddress(k.hooks) !== ZERO || !cur(k.intermediateCurrency))) throw new UserError('This swap routes through an unsupported pool.')
        cin = getAddress(mp.currencyIn); cout = getAddress(mp.path[mp.path.length - 1].intermediateCurrency)
        amountIn = mp.amountIn; minOut = mp.amountOutMinimum
      }
      const [settleCur, settleAmt] = decodeAbiParameters(CUR_AMOUNT, params[1]!) as [Address, bigint]
      const [takeCur, takeMin] = decodeAbiParameters(CUR_AMOUNT, params[2]!) as [Address, bigint]
      const ti = cur(cin), tt = cur(cout)
      if (!ti || !tt) throw new UserError('This swap uses a token ROUTIQ does not support.')
      if (getAddress(settleCur) !== cin || settleAmt !== amountIn || getAddress(takeCur) !== cout || takeMin !== minOut) throw new UserError('This swap does not pay or receive what it claims.')
      if (cin === ZERO ? value !== amountIn : value !== 0n) throw new UserError('ETH sent does not match the swap amount.')
      if (ti.kind === 'stock_token' || tt.kind === 'stock_token') involvesStockToken = true
      steps.push({ title: `Swap ${fmt(amountIn, ti.decimals)} ${ti.symbol} → at least ${fmt(minOut, tt.decimals)} ${tt.symbol}`, detail: `Uniswap v4 · paid to your wallet · deadline ${new Date(Number(deadline) * 1000).toISOString().slice(11, 16)} UTC` })
    } else if (to === UNI.swapRouter02) {
      const outer = decodeFunctionData({ abi: routerAbi, data })
      if (outer.functionName !== 'multicall') throw new UserError('Unexpected router call.')
      const [deadline, calls] = outer.args as [bigint, Hex[]]
      let sold = '', bought = ''
      let wantsUnwrap = false
      for (const c of calls) {
        const d = decodeFunctionData({ abi: routerAbi, data: c })
        if (d.functionName === 'exactInputSingle') {
          const a = (d.args as any)[0]
          if (getAddress(a.recipient) !== from && getAddress(a.recipient) !== ROUTER_SELF) throw new UserError('This swap would send tokens to someone else.')
          const ti = byAddr.get(getAddress(a.tokenIn)), tt = byAddr.get(getAddress(a.tokenOut))
          if (!ti || !tt) throw new UserError('This swap uses a token ROUTIQ does not support.')
          if (value > 0n && (ti.address !== WETH.address || value !== a.amountIn)) throw new UserError('ETH sent does not match the swap amount.')
          sold = `${fmt(a.amountIn, ti.decimals)} ${value > 0n ? 'ETH' : ti.symbol}`
          bought = `${fmt(a.amountOutMinimum, tt.decimals)} ${getAddress(a.recipient) === ROUTER_SELF ? 'ETH' : tt.symbol}`
          if (ti.kind === 'stock_token' || tt.kind === 'stock_token') involvesStockToken = true
          if (getAddress(a.recipient) === ROUTER_SELF) wantsUnwrap = true
        } else if (d.functionName === 'exactInput') {
          const a = (d.args as any)[0]
          if (getAddress(a.recipient) !== from && getAddress(a.recipient) !== ROUTER_SELF) throw new UserError('This swap would send tokens to someone else.')
          const hex = (a.path as string).slice(2)
          const hops: Address[] = []
          for (let i = 0; i + 40 <= hex.length; i += 46) hops.push(getAddress(`0x${hex.slice(i, i + 40)}`))
          const ti = byAddr.get(hops[0]!), tt = byAddr.get(hops[hops.length - 1]!)
          if (!ti || !tt || hops.some(h => !byAddr.has(h))) throw new UserError('This swap routes through a token ROUTIQ does not support.')
          if (value > 0n && (ti.address !== WETH.address || value !== a.amountIn)) throw new UserError('ETH sent does not match the swap amount.')
          sold = `${fmt(a.amountIn, ti.decimals)} ${value > 0n ? 'ETH' : ti.symbol}`
          bought = `${fmt(a.amountOutMinimum, tt.decimals)} ${getAddress(a.recipient) === ROUTER_SELF ? 'ETH' : tt.symbol}`
          if (ti.kind === 'stock_token' || tt.kind === 'stock_token') involvesStockToken = true
          if (getAddress(a.recipient) === ROUTER_SELF) wantsUnwrap = true
        } else if (d.functionName === 'unwrapWETH9') {
          const [, rcpt] = d.args as [bigint, Address]
          if (getAddress(rcpt) !== from) throw new UserError('This swap would send ETH to someone else.')
          wantsUnwrap = false
        } else throw new UserError('Unexpected router call.')
      }
      if (wantsUnwrap) throw new UserError('This swap would leave funds in the router.')
      if (!sold) throw new UserError('Empty swap.')
      steps.push({ title: `Swap ${sold} → at least ${bought}`, detail: `Uniswap v3 · deadline ${new Date(Number(deadline) * 1000).toISOString().slice(11, 16)} UTC` })
    } else {
      throw new UserError('This link calls a contract ROUTIQ does not use. Do not sign it.')
    }
    txs.push({ to, data, value: value.toString(), label: steps[steps.length - 1]!.title })
  }

  const sim = await simulate(from, txs)
  const gas = sim.steps.reduce((s, x) => s + x.gasUsed, 0)
  return {
    from, expired, involvesStockToken, steps,
    simulation: { ok: sim.ok, steps: sim.steps.map(s => ({ ok: s.ok, gasUsed: s.gasUsed, error: s.error })) },
    estimatedNetworkFee: gas ? await feeEstimate(gas) : null,
    transactions: txs.map(t => ({ to: t.to, data: t.data, value: t.value }))
  }
}
