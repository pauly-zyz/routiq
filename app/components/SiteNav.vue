<script setup lang="ts">
const { label, connect, busy, account, chainOk } = useWallet()
const openLink = useExternalLink()
const scrolled = ref(false)
const open = ref(false)
const links = [
  { label: 'Tools', to: '#tools' },
  { label: 'How it works', to: '#how' },
  { label: 'Pricing', to: '#pricing' },
  { label: 'Network', to: '#network' },
  { label: 'Roadmap', to: '#roadmap' }
]
const onScroll = () => { scrolled.value = window.scrollY > 12 }
onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) })
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4">
    <div
      :class="[
        'mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 rounded-full border pl-5 pr-2 transition-all duration-300',
        scrolled || open ? 'border-default bg-[#0B0B13]/75 shadow-2xl shadow-black/40 backdrop-blur-xl' : 'border-transparent'
      ]"
    >
      <a href="#top" class="flex items-center gap-2.5 font-display text-lg font-bold tracking-wide text-highlighted" aria-label="ROUTIQ home">
        <BrandMark :size="30" />ROUTIQ
      </a>

      <nav class="hidden items-center gap-1 lg:flex" aria-label="Main">
        <a v-for="l in links" :key="l.to" :href="l.to" class="rounded-full px-3.5 py-2 text-sm text-toned transition hover:bg-white/5 hover:text-highlighted">{{ l.label }}</a>
      </nav>

      <div class="flex items-center gap-1">
        <UButton class="hidden sm:inline-flex" icon="i-simple-icons-x" color="neutral" variant="ghost" aria-label="X" @click="openLink('x')" />
        <UButton class="hidden sm:inline-flex" icon="i-simple-icons-github" color="neutral" variant="ghost" aria-label="GitHub" @click="openLink('github')" />
        <UButton
          :label="label"
          :loading="busy"
          :class="[account ? 'font-mono' : 'bg-brand-gradient text-white shadow-lg shadow-violet-600/30 hover:opacity-90']"
          :color="account ? 'neutral' : 'primary'"
          :variant="account ? 'subtle' : 'solid'"
          :leading-icon="account ? (chainOk ? 'i-lucide-circle-check' : 'i-lucide-triangle-alert') : 'i-lucide-wallet'"
          @click="connect"
        />
        <UButton
          class="lg:hidden"
          :icon="open ? 'i-lucide-x' : 'i-lucide-menu'"
          color="neutral"
          variant="outline"
          :aria-expanded="open"
          aria-label="Menu"
          @click="open = !open"
        />
      </div>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-y-2"
      leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0 -translate-y-2"
    >
      <nav v-if="open" class="mx-auto mt-2 flex max-w-6xl flex-col rounded-3xl border border-default bg-[#0B0B13]/95 p-2 backdrop-blur-xl lg:hidden">
        <a v-for="l in links" :key="l.to" :href="l.to" class="rounded-2xl px-4 py-3 font-medium text-highlighted hover:bg-white/5" @click="open = false">{{ l.label }}</a>
      </nav>
    </Transition>
  </header>
</template>
