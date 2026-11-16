// Remote MCP endpoint (Streamable HTTP, stateless). Connect agents to https://<site>/mcp
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { SERVER_INFO, TOOL_SUMMARY, createRoutiqServer } from '../utils/mcpServer'

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, authorization, mcp-session-id, mcp-protocol-version, last-event-id',
  'access-control-expose-headers': 'mcp-session-id, mcp-protocol-version'
}

export default defineEventHandler(async (event) => {
  const method = event.method
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  // A plain browser visit gets a short description instead of a protocol error.
  if (method === 'GET' && !(getRequestHeader(event, 'accept') || '').includes('text/event-stream')) {
    return new Response(JSON.stringify({
      ...SERVER_INFO,
      protocol: 'MCP Streamable HTTP (stateless)',
      endpoint: getRequestURL(event).href,
      status: 'beta — all tools are free and read-only',
      tools: TOOL_SUMMARY,
      howToConnect: 'Add this URL as a remote MCP server in your agent or IDE.'
    }, null, 2), { headers: { 'content-type': 'application/json', ...CORS } })
  }

  const server = createRoutiqServer()
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  // Stateless JSON mode: each request gets a fresh server; nothing is kept between requests.
  const res = await transport.handleRequest(toWebRequest(event))
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
})
