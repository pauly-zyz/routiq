// Project settings. Edit before launch.
export type WalletChainKey = 'elysium' | 'robinhood'
export const SITE = {
  name: 'ROUTIQ',
  // Official $ROUTIQ contract on Elysium. Empty until launch — the UI then says it is announced at launch.
  tokenAddress: '',
  // Launch chain (Kinetiq's Hyperliquid L2). Shown on the site; tools for it roll out at launch.
  launch: { name: 'Elysium', chainId: 99901, gas: 'HYPE', by: 'Kinetiq', mainnetSince: 'November 9, 2026' },
  // `providers`: where tool providers apply (a form or email link). Empty = "Coming soon".
  links: { x: 'https://x.com/UseRoutiq', discord: '', providers: '', docs: '' } as Record<string, string>,
  // Wallet network params (EIP-3085). Elysium is the default network the site connects to.
  defaultChain: 'elysium' as WalletChainKey,
  chains: {
    elysium: {
      chainId: '0x1863d', // 99901, Elysium mainnet (Kinetiq's Hyperliquid L2)
      chainName: 'Elysium',
      nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
      rpcUrls: ['https://rpc.elysium.kinetiq.xyz']
    },
    robinhood: {
      chainId: '0x1237', // 4663, Robinhood Chain mainnet
      chainName: 'Robinhood Chain',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://rpc.mainnet.chain.robinhood.com'],
      blockExplorerUrls: ['https://robinhoodchain.blockscout.com']
    }
  } as Record<WalletChainKey, { chainId: string, chainName: string, nativeCurrency: { name: string, symbol: string, decimals: number }, rpcUrls: string[], blockExplorerUrls?: string[] }>
}

/** Absolute URL for a path on this site, using the configured site URL or the current origin. */
export function useSiteUrl(path: string) {
  const config = useRuntimeConfig()
  const base = String(config.public.siteUrl || '').replace(/\/$/, '')
  const url = ref(base ? `${base}${path}` : path)
  onMounted(() => {
    if (!base) url.value = `${window.location.origin}${path}`
  })
  return url
}

export const useSkillUrl = () => useSiteUrl('/SKILL.md')
export const useMcpUrl = () => useSiteUrl('/mcp')

export function useCopy() {
  const toast = useToast()
  return async (text: string, label = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: label, icon: 'i-lucide-check', color: 'success', duration: 1800 })
      return true
    } catch {
      toast.add({ title: 'Copy failed', description: 'Select the text and copy it manually.', color: 'error' })
      return false
    }
  }
}

/** For links that are not set yet: open them if configured, otherwise say "coming soon". */
export function useExternalLink() {
  const toast = useToast()
  return (key: string) => {
    const url = SITE.links[key]
    if (url) window.open(url, '_blank', 'noopener')
    else toast.add({ title: 'Coming soon', icon: 'i-lucide-clock', duration: 1800 })
  }
}
