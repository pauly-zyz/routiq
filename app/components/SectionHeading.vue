<script setup lang="ts">
withDefaults(defineProps<{ eyebrow: string, center?: boolean }>(), { center: false })
</script>

<template>
  <div v-reveal :class="['mb-12 md:mb-16 max-w-3xl', center && 'mx-auto text-center']">
    <span class="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[.16em] text-cyan-300">
      <span class="h-px w-6 bg-brand-gradient" />{{ eyebrow }}
    </span>
    <h2 class="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-highlighted sm:text-5xl lg:text-[58px]">
      <slot />
    </h2>
    <p v-if="$slots.sub" :class="['mt-5 text-lg text-muted max-w-2xl', center && 'mx-auto']">
      <slot name="sub" />
    </p>
  </div>
</template>
