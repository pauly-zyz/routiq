// Chain access for the MCP server: per-chain config, one viem client per chain, and the Robinhood stock-token registry.
import { createPublicClient, decodeAbiParameters, defineChain, getAddress, http, type Address, type PublicClient } from 'viem'
import snapshot from '../data/stock-tokens.json'

export type ChainKey = 'elysium' | 'robinhood'
export const CHAIN_KEYS: ChainKey[] = ['elysium', 'robinhood']
export const DEFAULT_CHAIN: ChainKey = 'elysium'

export interface ChainCfg {
  key: ChainKey
  id: number
  name: string
  native: { symbol: string, name: string }
  rpc: string
  explorer: string | null
  wrapped: { symbol: string, name: string, address: Address, decimals: number }
  stable: { symbol: string, name: string, address: Address, decimals: number }
  uni: {
    v3Factory: Address, quoterV2: Address, swapRouter02: Address,
    universalRouter: Address, permit2: Address, v4Quoter: Address, poolManager: Address, stateView: Address, v4PositionManager: Address
  }
}

const a = (x: string) => getAddress(x)

// Addresses are Uniswap's official deployments (Uniswap/contracts deployments/json/<chainId>.json), all checked on-chain.
export const CHAINS: Record<ChainKey, ChainCfg> = {
  elysium: {
    key: 'elysium',
    id: 99901,
    name: 'Elysium',
    native: { symbol: 'HYPE', name: 'HYPE' },
    rpc: 'https://rpc.elysium.kinetiq.xyz',
    explorer: null, // no official mainnet explorer published yet
    wrapped: { symbol: 'WHYPE', name: 'Wrapped HYPE', address: a('0xbA876237B0F021A6c6D852d6c26E107997cC5E81'), decimals: 18 },
    stable: { symbol: 'USDC', name: 'USDC', address: a('0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65'), decimals: 6 },
    uni: {
      v3Factory: a('0x1707327F626496A7b5b3872e7E4d2879Df7d7a9f'),
      quoterV2: a('0x204faca1764b154221e35c0d20abb3c525710498'),
      swapRouter02: a('0x2d01411773c8c24805306e89a41f7855c3c4fe65'),
      universalRouter: a('0xA13f7611115752DEB2B13813BDDE16A5073e4b45'),
      permit2: a('0x000000000022D473030F116dDEE9F6B43aC78BA3'),
      v4Quoter: a('0x379f556c5a748bd7cc9baf0f7a344094ac1814f5'),
      poolManager: a('0xE2e105d3F7209A9DA11f83cCf3E7398a753823F1'),
      stateView: a('0x27ed73ae0652fdcf71d6793412a7525f32be9dfe'),
      v4PositionManager: a('0x1d1C51b9d07fD27d36412A2b66CC23D19Eb3E518')
    }
  },
  robinhood: {
    key: 'robinhood',
    id: 4663,
    name: 'Robinhood Chain',
    native: { symbol: 'ETH', name: 'Ether' },
    rpc: 'https://rpc.mainnet.chain.robinhood.com',
    explorer: 'https://robinhoodchain.blockscout.com',
    wrapped: { symbol: 'WETH', name: 'Wrapped Ether', address: a('0x0bd7d308f8e1639fab988df18a8011f41eacad73'), decimals: 18 },
    // USDG (Global Dollar). Address from public developer docs; name/decimals checked on-chain.
    stable: { symbol: 'USDG', name: 'Global Dollar', address: a('0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'), decimals: 6 },
    uni: {
      v3Factory: a('0x1f7d7550b1b028f7571e69a784071f0205fd2efa'),
      quoterV2: a('0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7'),
      swapRouter02: a('0xcaf681a66d020601342297493863e78c959e5cb2'),
      universalRouter: a('0x8876789976decbfcbbbe364623c63652db8c0904'),
      permit2: a('0x000000000022D473030F116dDEE9F6B43aC78BA3'),
      v4Quoter: a('0x8dc178efb8111bb0973dd9d722ebeff267c98f94'),
      poolManager: a('0x8366a39cc670b4001a1121b8f6a443a643e40951'),
      stateView: a('0xf3334192d15450cdd385c8b70e03f9a6bd9e673b'),
      v4PositionManager: a('0x58daec3116aae6d93017baaea7749052e8a04fa7')
    }
  }
}

export const chainCfg = (key: ChainKey = DEFAULT_CHAIN) => CHAINS[key]
export const chainById = (id: number) => CHAIN_KEYS.map(k => CHAINS[k]).find(c => c.id === id)

// Backwards-compatible exports for the Robinhood-only tools.
export const USDG = CHAINS.robinhood.stable
export const EXPLORER = CHAINS.robinhood.explorer!

// Every Robinhood stock token is created by this factory (verified on-chain: TSLA, NVDA, ... come from its events).
export const STOCK_FACTORY = getAddress('0x4783C67b63dE2B358Ac5951a7D41F47A38F3C046')
const TOKEN_CREATED_TOPIC = '0xd9b0c6a1c0de228715ad0fa09f3259686ee84f8cc675e03ef7e47a9cdafa76d6'

export const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
] as const

const clients: Partial<Record<ChainKey, PublicClient>> = {}
export function chainClient(key: ChainKey = 'robinhood'): PublicClient {
  if (!clients[key]) {
    const cfg = CHAINS[key]
    const rc = useRuntimeConfig()
    const override = key === 'robinhood' ? (rc.rpcUrl as string) : (rc.elysiumRpcUrl as string)
    const url = override || cfg.rpc
    clients[key] = createPublicClient({
      chain: defineChain({
        id: cfg.id, name: cfg.name, nativeCurrency: { ...cfg.native, decimals: 18 },
        rpcUrls: { default: { http: [url] } },
        contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } }
      }),
      batch: { multicall: { batchSize: 16_384 } },
      transport: http(url, {
        batch: { batchSize: 50 },
        retryCount: 4,
        retryDelay: 700,
        timeout: 15_000,
        fetchOptions: { headers: { 'user-agent': 'routiq-mcp/0.3 (+https://www.routiq.tech)' } }
      })
    }) as PublicClient
  }
  return clients[key]!
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
    const c = chainClient('robinhood')
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

export function explorerAddress(addr: string, key: ChainKey = 'robinhood') {
  const e = CHAINS[key].explorer
  return e ? `${e}/address/${addr}` : null
}
export function explorerTx(h: string, key: ChainKey = 'robinhood') {
  const e = CHAINS[key].explorer
  return e ? `${e}/tx/${h}` : null
}
