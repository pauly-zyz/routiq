// Rebuilds server/data/v4-pools.json: Uniswap v4 pools ROUTIQ may route through.
// Keeps hookless pools with fee <= 1% between ETH (native), WETH, USDG, ROUTIQ and official stock tokens
// that currently have liquidity. Usage: node scripts/scan-v4-pools.mjs [rpcUrl]
import fs from 'node:fs'
import { createPublicClient, decodeAbiParameters, defineChain, http } from 'viem'

const RPC = process.argv[2] || process.env.NUXT_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com'
const POOL_MANAGER = '0x8366a39cc670b4001a1121b8f6a443a643e40951'
const STATE_VIEW = '0xf3334192d15450cdd385c8b70e03f9a6bd9e673b'
const INITIALIZE = '0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438'
const ZERO = '0x0000000000000000000000000000000000000000'

const chain = defineChain({
  id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } }, contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } }
})
const client = createPublicClient({ chain, batch: { multicall: { batchSize: 32_768 } }, transport: http(RPC, { retryCount: 8, retryDelay: 1500, fetchOptions: { headers: { 'user-agent': 'routiq-scan/0.1' } } }) })

const reg = JSON.parse(fs.readFileSync(new URL('../server/data/stock-tokens.json', import.meta.url), 'utf8'))
const KNOWN = new Set([ZERO, '0x0bd7d308f8e1639fab988df18a8011f41eacad73', '0x5fc5360d0400a0fd4f2af552add042d716f1d168', '0x3d58fdb1665cd386b5c96efb48a466022d8121e6', ...reg.tokens.map(t => t.address.toLowerCase())])
const addrOf = topic => `0x${topic.slice(26)}`.toLowerCase()

const latest = Number(await client.getBlockNumber())
let from = 0, range = 9_999_999, seen = 0
const pools = []
while (from <= latest) {
  const to = Math.min(from + range, latest)
  let logs
  try {
    logs = await client.request({ method: 'eth_getLogs', params: [{ address: POOL_MANAGER, topics: [INITIALIZE], fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }] })
  } catch (err) {
    const cap = /only (\d+) are allowed/.exec(String(err?.details || err?.message))?.[1]
    if (cap && Number(cap) - 1 < range) { range = Number(cap) - 1; continue }
    throw err
  }
  seen += logs.length
  for (const l of logs) {
    const c0 = addrOf(l.topics[2]), c1 = addrOf(l.topics[3])
    if (!KNOWN.has(c0) || !KNOWN.has(c1)) continue
    const [fee, tickSpacing, hooks] = decodeAbiParameters([{ type: 'uint24' }, { type: 'int24' }, { type: 'address' }, { type: 'uint160' }, { type: 'int24' }], l.data)
    if (hooks.toLowerCase() !== ZERO || fee > 10_000) continue
    pools.push({ id: l.topics[1], c0, c1, fee, tickSpacing })
  }
  process.stdout.write(`\rblock ${to}/${latest} · pools seen ${seen} · candidates ${pools.length}   `)
  from = to + 1
}

const liqAbi = [{ type: 'function', name: 'getLiquidity', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ type: 'uint128' }] }]
const liq = []
for (let i = 0; i < pools.length; i += 2000) {
  const r = await client.multicall({ allowFailure: true, contracts: pools.slice(i, i + 2000).map(p => ({ address: STATE_VIEW, abi: liqAbi, functionName: 'getLiquidity', args: [p.id] })) })
  liq.push(...r.map(x => (x.status === 'success' ? x.result : 0n)))
}
const live = pools.map((p, i) => ({ ...p, liquidity: liq[i] })).filter(p => p.liquidity > 0n)
live.sort((a, b) => (a.c0 + a.c1).localeCompare(b.c0 + b.c1) || (b.liquidity > a.liquidity ? 1 : -1))

const out = {
  source: `Uniswap v4 PoolManager ${POOL_MANAGER} Initialize events; hookless pools with fee <= 1% between ETH, WETH, USDG, ROUTIQ and official stock tokens that had liquidity at scan time. Rebuild: node scripts/scan-v4-pools.mjs`,
  scannedToBlock: latest,
  pools: live.map(p => [p.c0, p.c1, p.fee, p.tickSpacing, p.liquidity.toString()])
}
fs.writeFileSync(new URL('../server/data/v4-pools.json', import.meta.url), JSON.stringify(out))
console.log(`\nwrote ${live.length} pools (of ${seen} v4 pools on chain)`)
