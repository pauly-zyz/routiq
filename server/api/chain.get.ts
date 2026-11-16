// Latest block + gas for the website's live widgets. Cached briefly at the CDN so visitors share one RPC read.
import { chainClient } from '../utils/chain'

export default defineEventHandler(async (event) => {
  const c = chainClient()
  try {
    const [block, gasWei] = await Promise.all([c.getBlockNumber(), c.getGasPrice()])
    setResponseHeader(event, 'cache-control', 'public, max-age=0, s-maxage=2, stale-while-revalidate=10')
    return { block: Number(block), gasWei: gasWei.toString(), at: Date.now() }
  } catch {
    setResponseStatus(event, 502)
    setResponseHeader(event, 'cache-control', 'no-store')
    return { error: 'RPC unavailable' }
  }
})
