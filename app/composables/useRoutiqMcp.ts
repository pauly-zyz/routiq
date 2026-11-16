// Calls the site's own MCP endpoint (/mcp) with a plain JSON-RPC tools/call request.
export function useRoutiqMcp() {
  let id = 0
  async function callTool<T = any>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const res = await $fetch<any>('/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json, text/event-stream' },
      body: { jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name, arguments: args } }
    })
    if (res?.error) throw new Error(res.error.message || 'MCP error')
    const text: string = res?.result?.content?.[0]?.text ?? ''
    if (res?.result?.isError) throw new Error(text || 'Tool error')
    try { return JSON.parse(text) as T } catch { return text as T }
  }
  return { callTool }
}
