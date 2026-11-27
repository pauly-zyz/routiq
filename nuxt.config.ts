// ROUTIQ — agent-native tool router for Robinhood Chain.
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@nuxt/ui'],
  devtools: { enabled: false },

  css: [
    '@fontsource-variable/inter',
    '@fontsource-variable/space-grotesk',
    '@fontsource-variable/jetbrains-mono',
    '~/assets/css/main.css'
  ],

  // Fonts come from @fontsource (self-hosted), so the Google Fonts fetcher is off.
  ui: { fonts: false },
  colorMode: { preference: 'dark', fallback: 'dark' },

  icon: {
    serverBundle: 'local',
    clientBundle: { scan: { globInclude: ['app/**/*.{vue,ts}'] } }
  },

  runtimeConfig: {
    // Server-only RPC for the MCP tools (set NUXT_RPC_URL to a provider endpoint in production).
    rpcUrl: '',
    public: {
      // Public site URL: install commands, MCP URL and SEO tags. Override with NUXT_PUBLIC_SITE_URL.
      siteUrl: 'https://www.routiq.tech',
      rpcUrl: 'https://rpc.mainnet.chain.robinhood.com'
    }
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [{ name: 'theme-color', content: '#050B0A' }]
    }
  },

  nitro: {
    prerender: { routes: ['/', '/SKILL.md'] },
    esbuild: { options: { target: 'es2022' } }
  }
})
