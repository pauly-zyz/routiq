// Robinhood Chain access for the MCP server: one viem client and the official stock-token registry.
import { createPublicClient, decodeAbiParameters, defineChain, getAddress, http, type PublicClient } from 'viem'
import snapshot from '../data/stock-tokens.json'

export const robinhood = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } }
})

export const EXPLORER = 'https://robinhoodchain.blockscout.com'

// Every Robinhood stock token is created by this factory (verified on-chain: TSLA, NVDA, ... come from its events).
export const STOCK_FACTORY = getAddress('0x4783C67b63dE2B358Ac5951a7D41F47A38F3C046')
const TOKEN_CREATED_TOPIC = '0xd9b0c6a1c0de228715ad0fa09f3259686ee84f8cc675e03ef7e47a9cdafa76d6'

// USDG (Global Dollar). Address from public developer docs; name/decimals checked on-chain.
export const USDG = { symbol: 'USDG', name: 'Global Dollar', address: getAddress('0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'), decimals: 6 }

export const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
] as const

let client: PublicClient | undefined
export function chainClient(): PublicClient {
  if (!client) {
    const url = (useRuntimeConfig().rpcUrl as string) || robinhood.rpcUrls.default.http[0]
    client = createPublicClient({
      chain: robinhood,
      batch: { multicall: { batchSize: 16_384 } },
      transport: http(url, {
        batch: { batchSize: 50 },
        retryCount: 4,
        retryDelay: 700,
        timeout: 15_000,
        fetchOptions: { headers: { 'user-agent': 'routiq-mcp/0.1 (+https://github.com/pauly-zyz/routiq)' } }
      })
    }) as PublicClient
  }
  return client
}

export interface StockToken { symbol: string, name: string, address: `0x${string}` }

let registry: { at: number, tokens: StockToken[], live: boolean } | undefined
const REGISTRY_TTL_MS = 10 * 60_000
const DEFAULT_LOG_RANGE = 9_999_999n

/** Official stock tokens: bundled snapshot + any newer tokens read live from factory events. */
export async function stockTokens() {
  if (registry && Date.now() - registry.at < REGISTRY_TTL_MS) return registry
  const tokens: StockToken[] = snapshot.tokens.map(t => ({ ...t, address: getAddress(t.address) }))
  let live = false
  try {
    const c = chainClient()
    const latest = await c.getBlockNumber()
    let from = BigInt(snapshot.scannedToBlock) + 1n
    let range = DEFAULT_LOG_RANGE
    while (from <= latest) {
      const to = from + range > latest ? latest : from + range
      let logs: { data: `0x${string}` }[]
      try {
        logs = await c.request({
          method: 'eth_getLogs',
          params: [{ address: STOCK_FACTORY, topics: [TOKEN_CREATED_TOPIC], fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }]
        }) as { data: `0x${string}` }[]
      } catch (err: any) {
        // The RPC caps the block span per query and says the cap in its error ("only N are allowed").
        const cap = /only (\d+) are allowed/.exec(String(err?.details || err?.message))?.[1]
        if (!cap || BigInt(cap) - 1n >= range) throw err
        range = BigInt(cap) - 1n
        continue
      }
      for (const log of logs) {
        const [address, name, symbol] = decodeAbiParameters([{ type: 'address' }, { type: 'string' }, { type: 'string' }], log.data)
        if (!tokens.some(t => t.address === getAddress(address))) tokens.push({ symbol, name, address: getAddress(address) })
      }
      from = to + 1n
    }
    live = true
  } catch {
    // Keep the snapshot if the RPC is unavailable; `live: false` tells callers it may miss the newest listings.
  }
  registry = { at: Date.now(), tokens, live }
  return registry
}

export function explorerAddress(a: string) { return `${EXPLORER}/address/${a}` }
export function explorerTx(h: string) { return `${EXPLORER}/tx/${h}` }
