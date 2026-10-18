// Project settings. Edit before launch.
export const SITE = {
  name: 'ROUTIQ',
  // Official $ROUTIQ contract. Leave empty until deployed — the UI then shows a warning instead.
  tokenAddress: '',
  links: { x: '', discord: '', github: '', docs: '' } as Record<string, string>,
  chain: {
    chainId: '0x1237', // 4663, Robinhood Chain mainnet
    chainName: 'Robinhood Chain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://robinhoodchain.blockscout.com']
  }
}

/** Absolute URL of the hosted SKILL.md, using the configured site URL or the current origin. */
export function useSkillUrl() {
  const config = useRuntimeConfig()
  const url = ref(config.public.siteUrl ? `${config.public.siteUrl.replace(/\/$/, '')}/SKILL.md` : '/SKILL.md')
  onMounted(() => {
    if (!config.public.siteUrl) url.value = `${window.location.origin}/SKILL.md`
  })
  return url
}

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
