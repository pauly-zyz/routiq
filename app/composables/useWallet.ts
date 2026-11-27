// Minimal EIP-1193 wallet connection (MetaMask, Rabby, Robinhood Wallet, ...), for Elysium (default) and Robinhood Chain.
interface Eip1193 {
  request: (args: { method: string, params?: unknown[] }) => Promise<any>
  on?: (event: string, cb: (...args: any[]) => void) => void
}
declare global { interface Window { ethereum?: Eip1193 } }

let listening = false

export function useWallet() {
  const account = useState<string | null>('wallet-account', () => null)
  const chainId = useState<string | null>('wallet-chain-id', () => null)
  const busy = useState<boolean>('wallet-busy', () => false)
  const toast = useToast()
  const eth = () => (import.meta.client ? window.ethereum : undefined)
  const short = computed(() => (account.value ? `${account.value.slice(0, 6)}…${account.value.slice(-4)}` : ''))
  const onChain = (key: WalletChainKey) => chainId.value === SITE.chains[key].chainId
  // "OK" means the wallet is on the site's default network (Elysium).
  const chainOk = computed(() => onChain(SITE.defaultChain))

  const readChain = async () => {
    try { chainId.value = String(await eth()!.request({ method: 'eth_chainId' })).toLowerCase() }
    catch { chainId.value = null }
  }

  const ensureChain = async (key: WalletChainKey = SITE.defaultChain) => {
    const params = SITE.chains[key]
    try {
      await eth()!.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: params.chainId }] })
    } catch (err: any) {
      const code = err?.code ?? err?.data?.originalError?.code
      if (code !== 4902 && code !== -32603) throw err
      await eth()!.request({ method: 'wallet_addEthereumChain', params: [params] })
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
    description: 'Install MetaMask, Rabby or another EVM wallet to continue.',
    icon: 'i-lucide-wallet', color: 'warning'
  })

  async function connect(key: WalletChainKey = SITE.defaultChain) {
    if (!eth()) return noWallet()
    if (account.value && onChain(key)) {
      await navigator.clipboard?.writeText(account.value).catch(() => {})
      return toast.add({ title: `Connected · ${short.value}`, description: 'Address copied.', icon: 'i-lucide-check', color: 'success' })
    }
    busy.value = true
    try {
      if (!account.value) account.value = (await eth()!.request({ method: 'eth_requestAccounts' }))[0] ?? null
      await ensureChain(key)
      if (account.value && onChain(key)) toast.add({ title: `Connected to ${SITE.chains[key].chainName}`, icon: 'i-lucide-check', color: 'success' })
    } catch (err) { fail(err) } finally { busy.value = false }
  }

  async function addNetwork(key: WalletChainKey = SITE.defaultChain) {
    if (!eth()) return noWallet()
    try {
      await ensureChain(key)
      toast.add({ title: `${SITE.chains[key].chainName} is ready in your wallet`, icon: 'i-lucide-check', color: 'success' })
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

  const label = computed(() => (!account.value ? 'Connect wallet' : !chainOk.value ? 'Switch to Elysium' : short.value))
  return { account, chainId, chainOk, onChain, busy, short, label, connect, addNetwork }
}
