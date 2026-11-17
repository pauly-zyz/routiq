// Decodes and simulates a /sign link. The sign page only shows what this endpoint derives from the calldata.
import { UserError, inspectPayload } from '../../utils/actions'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ payload?: string }>(event)
  setResponseHeader(event, 'cache-control', 'no-store')
  try {
    if (!body?.payload || body.payload.length > 12_000) throw new UserError('Missing or oversized link.')
    let decoded: unknown
    try { decoded = JSON.parse(Buffer.from(body.payload, 'base64url').toString('utf8')) } catch { throw new UserError('This link is malformed.') }
    return { ok: true, ...(await inspectPayload(decoded)) }
  } catch (err: any) {
    if (err instanceof UserError) return { ok: false, error: err.message }
    setResponseStatus(event, 502)
    return { ok: false, error: 'Could not reach Robinhood Chain to check this link. Try again in a moment.' }
  }
})
