export default defineAppConfig({
  ui: {
    colors: { primary: 'teal', secondary: 'emerald', neutral: 'zinc' },
    button: { slots: { base: 'rounded-full font-medium cursor-pointer' } },
    badge: { slots: { base: 'rounded-full font-mono tracking-wide' } }
  }
})
