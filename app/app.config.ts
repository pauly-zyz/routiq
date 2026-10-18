export default defineAppConfig({
  ui: {
    colors: { primary: 'violet', secondary: 'cyan', neutral: 'zinc' },
    button: { slots: { base: 'rounded-full font-medium cursor-pointer' } },
    badge: { slots: { base: 'rounded-full font-mono tracking-wide' } }
  }
})
