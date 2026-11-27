// Rebuilds the Elysium snapshots used by the MCP tools:
//   server/data/elysium-v4-pools.json  hookless Uniswap v4 pools (fee <= 1%) touching HYPE / WHYPE / USDC that hold liquidity
//   server/data/elysium-tokens.json    tokens with real HYPE/USDC depth on Uniswap v3 or v4 (one per symbol, deepest wins)
// Usage: node scripts/scan-elysium.mjs [cached-scan.json]
// Without a cached scan it reads every PoolManager Initialize / v3 PoolCreated log from the Elysium RPC (slow: ~130k pools).
import fs from 'node:fs'
import { createPublicClient, http, defineChain, decodeAbiParameters, keccak256, toHex, getAddress } from 'viem'

const RPC = process.env.ELYSIUM_RPC || 'https://rpc.elysium.kinetiq.xyz'
const chain = defineChain({ id: 99901, name: 'Elysium', nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 }, rpcUrls: { default: { http: [RPC] } }, contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } } })
const c = createPublicClient({ chain, batch: { multicall: { batchSize: 32_768 } }, transport: http(undefined, { retryCount: 8, retryDelay: 1200, fetchOptions: { headers: { 'user-agent': 'routiq-scan' } } }) })

const PM = '0xE2e105d3F7209A9DA11f83cCf3E7398a753823F1'
const V3F = '0x1707327F626496A7b5b3872e7E4d2879Df7d7a9f'
const SV = '0x27ed73ae0652fdcf71d6793412a7525f32be9dfe'
const ZERO = '0x0000000000000000000000000000000000000000'
const WHYPE = '0xba876237b0f021a6c6d852d6c26e107997cc5e81'
const USDC = '0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65'
const HUBS = new Set([ZERO, WHYPE, USDC])
const MIN_DEPTH_HYPE = Number(process.env.MIN_DEPTH_HYPE || 1) // round-trip size (in HYPE) a token must hold to be listed

const a = t => ('0x' + t.slice(26)).toLowerCase()
async function scan(address, topic, latest) {
  let from = 0, range = 9_999_999; const out = []
  while (from <= latest) {
    const to = Math.min(from + range, latest)
    try { out.push(...await c.request({ method: 'eth_getLogs', params: [{ address, topics: [topic], fromBlock: '0x' + from.toString(16), toBlock: '0x' + to.toString(16) }] })); from = to + 1 }
    catch (e) { const cap = /only (\d+) are allowed/.exec(String(e.details || e.message))?.[1]; if (cap && +cap - 1 < range) { range = +cap - 1; continue } if (range > 1000) { range = Math.floor(range / 4); continue } throw e }
    process.stdout.write(`\r${address.slice(0, 8)} ${to}/${latest} logs ${out.length}   `)
  }
  console.log(); return out
}

let data
if (process.argv[2]) data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
else {
  const latest = Number(await c.getBlockNumber())
  const v4 = await scan(PM, '0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438', latest)
  const v3 = await scan(V3F, keccak256(toHex('PoolCreated(address,address,uint24,int24,address)')), latest)
  data = {
    latest,
    v4pools: v4.map(l => { const [fee, ts, hooks] = decodeAbiParameters([{ type: 'uint24' }, { type: 'int24' }, { type: 'address' }, { type: 'uint160' }, { type: 'int24' }], l.data); return { id: l.topics[1], c0: a(l.topics[2]), c1: a(l.topics[3]), fee, ts, hooks: hooks.toLowerCase() } }),
    v3pools: v3.map(l => { const [ts, pool] = decodeAbiParameters([{ type: 'int24' }, { type: 'address' }], l.data); return { c0: a(l.topics[1]), c1: a(l.topics[2]), fee: Number(BigInt(l.topics[3])), ts, pool: pool.toLowerCase() } })
  }
}

const touchesHub = p => HUBS.has(p.c0) || HUBS.has(p.c1)
const v4c = data.v4pools.filter(p => p.hooks === ZERO && Number(p.fee) <= 10_000 && touchesHub(p))
const v3c = data.v3pools.filter(touchesHub)
console.log('candidates v4', v4c.length, 'v3', v3c.length)

const svAbi = [
  { type: 'function', name: 'getLiquidity', stateMutability: 'view', inputs: [{ type: 'bytes32' }], outputs: [{ type: 'uint128' }] },
  { type: 'function', name: 'getSlot0', stateMutability: 'view', inputs: [{ type: 'bytes32' }], outputs: [{ type: 'uint160' }, { type: 'int24' }, { type: 'uint24' }, { type: 'uint24' }] }
]
const v3Abi = [
  { type: 'function', name: 'liquidity', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint128' }] },
  { type: 'function', name: 'slot0', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint160' }, { type: 'int24' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint8' }, { type: 'bool' }] }
]
async function many(calls) {
  const out = []
  for (let i = 0; i < calls.length; i += 3000) {
    out.push(...await c.multicall({ allowFailure: true, contracts: calls.slice(i, i + 3000) }))
    process.stdout.write(`\rcalls ${Math.min(i + 3000, calls.length)}/${calls.length}   `)
  }
  console.log(); return out.map(r => (r.status === 'success' ? r.result : null))
}
const v4r = await many(v4c.flatMap(p => [{ address: SV, abi: svAbi, functionName: 'getLiquidity', args: [p.id] }, { address: SV, abi: svAbi, functionName: 'getSlot0', args: [p.id] }]))
const v3r = await many(v3c.flatMap(p => [{ address: p.pool, abi: v3Abi, functionName: 'liquidity' }, { address: p.pool, abi: v3Abi, functionName: 'slot0' }]))

const pools = [
  ...v4c.map((p, i) => ({ ...p, v: 4, L: v4r[2 * i] ?? 0n, sp: v4r[2 * i + 1]?.[0] ?? 0n })),
  ...v3c.map((p, i) => ({ ...p, v: 3, L: v3r[2 * i] ?? 0n, sp: v3r[2 * i + 1]?.[0] ?? 0n }))
].filter(p => p.L > 0n && p.sp > 0n)

// HYPE price in USDC from the deepest HYPE/USDC or WHYPE/USDC pool (USDC per HYPE, both normalised).
let usdcPerHype = 0, best = 0n
for (const p of pools) {
  const hype = (p.c0 === ZERO || p.c0 === WHYPE) && p.c1 === USDC ? 0 : (p.c1 === WHYPE && p.c0 === USDC ? 1 : -1)
  if (hype < 0 || p.L <= best) continue
  best = p.L
  const price = (Number(p.sp) / 2 ** 96) ** 2 // token1 per token0, raw
  usdcPerHype = hype === 0 ? price * 1e12 : (1 / price) * 1e12
}
console.log('HYPE ≈', usdcPerHype.toFixed(2), 'USDC')

// Real depth: quote a buy of N HYPE worth of the token and sell the output straight back through the same pool.
// A pool "holds" size N when the round trip returns at least 90%. Depth = the largest N in SIZES that passes.
const SIZES = [1, 10, 100, 1000]
const hubAmount = (hub, n) => (hub === USDC ? BigInt(Math.round(n * usdcPerHype * 1e6)) : BigInt(n) * 10n ** 18n)
const q4 = [{ type: 'function', name: 'quoteExactInputSingle', stateMutability: 'nonpayable', inputs: [{ type: 'tuple', components: [{ name: 'poolKey', type: 'tuple', components: [{ name: 'currency0', type: 'address' }, { name: 'currency1', type: 'address' }, { name: 'fee', type: 'uint24' }, { name: 'tickSpacing', type: 'int24' }, { name: 'hooks', type: 'address' }] }, { name: 'zeroForOne', type: 'bool' }, { name: 'exactAmount', type: 'uint128' }, { name: 'hookData', type: 'bytes' }] }], outputs: [{ type: 'uint256' }, { type: 'uint256' }] }]
const q3 = [{ type: 'function', name: 'quoteExactInputSingle', stateMutability: 'nonpayable', inputs: [{ type: 'tuple', components: [{ name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'fee', type: 'uint24' }, { name: 'sqrtPriceLimitX96', type: 'uint160' }] }], outputs: [{ type: 'uint256' }, { type: 'uint160' }, { type: 'uint32' }, { type: 'uint256' }] }]
const V4Q = '0x379f556c5a748bd7cc9baf0f7a344094ac1814f5', V3Q = '0x204faca1764b154221e35c0d20abb3c525710498'
const quoteCall = (p, tin, amt) => (p.v === 4
  ? { address: V4Q, abi: q4, functionName: 'quoteExactInputSingle', args: [{ poolKey: { currency0: p.c0, currency1: p.c1, fee: Number(p.fee), tickSpacing: Number(p.ts), hooks: ZERO }, zeroForOne: p.c0 === tin, exactAmount: amt, hookData: '0x' }] }
  : { address: V3Q, abi: q3, functionName: 'quoteExactInputSingle', args: [{ tokenIn: tin, tokenOut: tin === p.c0 ? p.c1 : p.c0, amountIn: amt, fee: Number(p.fee), sqrtPriceLimitX96: 0n }] })
// Pre-filter on liquidity so we only quote the few deepest pools per token.
const byToken = new Map()
for (const p of pools) {
  const t = HUBS.has(p.c0) ? p.c1 : p.c0 // for hub/hub pairs (HYPE/USDC, WHYPE/USDC) this is the second hub
  byToken.set(t, [...(byToken.get(t) ?? []), p])
}
const quoted = [...byToken.values()].flatMap(ps => ps.sort((x, y) => (y.L > x.L ? 1 : -1)).slice(0, 3))
for (const p of quoted) { p.hub = HUBS.has(p.c0) ? p.c0 : p.c1; p.depth = 0 }
let alive = quoted.filter(p => !(p.hub === USDC && !usdcPerHype))
for (const n of SIZES) {
  const buys = await many(alive.map(p => quoteCall(p, p.hub, hubAmount(p.hub, n))))
  const back = alive.map((p, i) => (buys[i] && buys[i][0] > 0n ? p : null))
  const sells = await many(alive.flatMap((p, i) => (back[i] ? [quoteCall(p, HUBS.has(p.c0) ? p.c1 : p.c0, buys[i][0] > 2n ** 128n - 1n ? 2n ** 128n - 1n : buys[i][0])] : [])))
  let k = 0; const next = []
  alive.forEach((p, i) => {
    if (!back[i]) return
    const r = sells[k++]
    if (r && r[0] * 100n >= hubAmount(p.hub, n) * 90n) { p.depth = n; next.push(p) }
  })
  console.log(`size ${n} HYPE: ${next.length} pools pass`)
  alive = next
}

const v4Live = quoted.filter(p => p.v === 4 && p.depth >= 1)
const snapshot = {
  source: `Uniswap v4 PoolManager ${PM} Initialize events on Elysium; hookless pools with fee <= 1% touching HYPE, WHYPE or USDC whose 1 HYPE buy-and-sell-back round trip returned >= 90% at scan time. Rebuild: node scripts/scan-elysium.mjs`,
  scannedToBlock: data.latest,
  pools: v4Live.sort((x, y) => y.depth - x.depth || (y.L > x.L ? 1 : -1)).map(p => [p.c0, p.c1, Number(p.fee), Number(p.ts), p.L.toString()])
}

// Token list: the non-hub side of pools that passed, ranked by depth then liquidity.
const depthByToken = new Map()
for (const p of quoted) {
  if (p.depth < MIN_DEPTH_HYPE) continue
  const t = HUBS.has(p.c0) ? p.c1 : p.c0
  depthByToken.set(t, Math.max(depthByToken.get(t) ?? 0, p.depth))
}
const cand = [...depthByToken].sort((x, y) => y[1] - x[1])
const erc20 = ['symbol', 'name', 'decimals'].map(n => ({ type: 'function', name: n, stateMutability: 'view', inputs: [], outputs: [{ type: n === 'decimals' ? 'uint8' : 'string' }] }))
const meta = await many(cand.flatMap(([t]) => erc20.map(f => ({ address: t, abi: [f], functionName: f.name }))))
const seen = new Set(['HYPE', 'WHYPE', 'USDC', 'ROUTIQ'])
const tokens = []
cand.forEach(([t, d], i) => {
  const [symbol, name, decimals] = meta.slice(3 * i, 3 * i + 3)
  if (typeof symbol !== 'string' || typeof name !== 'string' || decimals == null) return
  const clean = s => s.replace(/[^\x20-\x7e]/g, '').trim()
  const sym = clean(symbol)
  if (!sym || sym.length > 16 || seen.has(sym.toUpperCase())) return // impersonators and duplicates of an already-listed symbol are left out
  seen.add(sym.toUpperCase())
  tokens.push({ symbol: sym, name: clean(name).slice(0, 48) || sym, address: getAddress(t), decimals: Number(decimals), depthHype: d })
})
const list = {
  source: `Tokens whose ${MIN_DEPTH_HYPE} HYPE buy-and-sell-back round trip returned >= 90% against HYPE, WHYPE or USDC on Uniswap v3/v4 on Elysium at block ${data.latest}. One token per symbol (the deepest); listing is not an endorsement. Rebuild: node scripts/scan-elysium.mjs`,
  scannedToBlock: data.latest,
  tokens: tokens.slice(0, 150)
}
fs.writeFileSync('server/data/elysium-v4-pools.json', JSON.stringify(snapshot))
fs.writeFileSync('server/data/elysium-tokens.json', JSON.stringify(list, null, 1))
console.log('v4 pools kept', snapshot.pools.length, '| tokens listed', list.tokens.length)
console.log(list.tokens.slice(0, 25).map(t => `${t.symbol}(${t.depthHype})`).join(' '))
