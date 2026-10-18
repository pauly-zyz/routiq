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
    public: {
      // Public site URL, used for the install command (falls back to the browser origin).
      siteUrl: '',
      rpcUrl: 'https://rpc.mainnet.chain.robinhood.com'
    }
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [{ name: 'theme-color', content: '#06060B' }]
    }
  },

  nitro: { prerender: { routes: ['/', '/SKILL.md'] } }
})
