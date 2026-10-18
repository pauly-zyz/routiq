// Minimal EIP-1193 wallet connection (MetaMask, Rabby, Robinhood Wallet, ...).
interface Eip1193 {
  request: (args: { method: string, params?: unknown[] }) => Promise<any>
  on?: (event: string, cb: (...args: any[]) => void) => void
}
declare global { interface Window { ethereum?: Eip1193 } }

let listening = false

export function useWallet() {
  const account = useState<string | null>('wallet-account', () => null)
  const chainOk = useState<boolean>('wallet-chain-ok', () => false)
  const busy = useState<boolean>('wallet-busy', () => false)
  const toast = useToast()
  const rpcUrl = useRuntimeConfig().public.rpcUrl
  const eth = () => (import.meta.client ? window.ethereum : undefined)
  const short = computed(() => (account.value ? `${account.value.slice(0, 6)}…${account.value.slice(-4)}` : ''))

  const readChain = async () => {
    try { chainOk.value = String(await eth()!.request({ method: 'eth_chainId' })).toLowerCase() === SITE.chain.chainId }
    catch { chainOk.value = false }
  }

  const ensureChain = async () => {
    try {
      await eth()!.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SITE.chain.chainId }] })
    } catch (err: any) {
      const code = err?.code ?? err?.data?.originalError?.code
      if (code !== 4902 && code !== -32603) throw err
      await eth()!.request({
        method: 'wallet_addEthereumChain',
        params: [{ ...SITE.chain, rpcUrls: [rpcUrl] }]
      })
    }
    await readChain()
  }

  const fail = (err: any) => toast.add({
    title: err?.code === 4001 ? 'Request cancelled in wallet' : 'Wallet error',
    description: err?.code === 4001 ? undefined : 'Please try again.',
    color: 'error', icon: 'i-lucide-circle-alert'
  })

  const noWallet = () => toast.add({
    title: 'No wallet found',
    description: 'Install MetaMask, Rabby or Robinhood Wallet to continue.',
    icon: 'i-lucide-wallet', color: 'warning'
  })

  async function connect() {
    if (!eth()) return noWallet()
    if (account.value && chainOk.value) {
      await navigator.clipboard?.writeText(account.value).catch(() => {})
      return toast.add({ title: `Connected · ${short.value}`, description: 'Address copied.', icon: 'i-lucide-check', color: 'success' })
    }
    busy.value = true
    try {
      if (!account.value) account.value = (await eth()!.request({ method: 'eth_requestAccounts' }))[0] ?? null
      await ensureChain()
      if (account.value && chainOk.value) toast.add({ title: 'Connected to Robinhood Chain', icon: 'i-lucide-check', color: 'success' })
    } catch (err) { fail(err) } finally { busy.value = false }
  }

  async function addNetwork() {
    if (!eth()) return noWallet()
    try {
      await ensureChain()
      toast.add({ title: 'Robinhood Chain is ready in your wallet', icon: 'i-lucide-check', color: 'success' })
    } catch (err) { fail(err) }
  }

  onMounted(() => {
    const p = eth()
    if (!p || listening) return
    listening = true
    p.request({ method: 'eth_accounts' }).then(async (accs: string[]) => {
      account.value = accs[0] ?? null
      if (account.value) await readChain()
    }).catch(() => {})
    p.on?.('accountsChanged', (accs: string[]) => { account.value = accs[0] ?? null })
    p.on?.('chainChanged', () => { readChain() })
  })

  const label = computed(() => (!account.value ? 'Connect wallet' : !chainOk.value ? 'Switch network' : short.value))
  return { account, chainOk, busy, short, label, connect, addNetwork }
}
