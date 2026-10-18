// v-reveal: fade-up when the element scrolls into view. Optional value = delay in ms.
// v-spotlight: card glow that follows the pointer.
export default defineNuxtPlugin((nuxtApp) => {
  let io: IntersectionObserver | null = null
  const getIO = () => {
    if (!io) {
      io = new IntersectionObserver((entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add('is-revealed')
            io!.unobserve(en.target)
          }
        }
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    }
    return io
  }

  nuxtApp.vueApp.directive<HTMLElement, number | undefined>('reveal', {
    mounted(el, binding) {
      if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)
      el.classList.add('reveal')
      getIO().observe(el)
    },
    unmounted(el) { io?.unobserve(el) },
    getSSRProps: () => ({})
  })

  nuxtApp.vueApp.directive<HTMLElement & { _spot?: (e: PointerEvent) => void }>('spotlight', {
    mounted(el) {
      el.classList.add('spotlight')
      el._spot = (e: PointerEvent) => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      }
      el.addEventListener('pointermove', el._spot, { passive: true })
    },
    unmounted(el) { if (el._spot) el.removeEventListener('pointermove', el._spot) },
    getSSRProps: () => ({ class: 'spotlight' })
  })
})
