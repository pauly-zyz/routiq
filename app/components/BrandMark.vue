<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 30 })
const id = useId()
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true" class="shrink-0">
    <defs>
      <linearGradient :id="`bm-${id}`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7C5CFF" />
        <stop offset="1" stop-color="#38D9F5" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" :fill="`url(#bm-${id})`" />
    <path d="M9 22V14a4 4 0 0 1 4-4h10" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" />
    <circle cx="9" cy="22" r="2.6" fill="#fff" />
    <circle cx="23" cy="10" r="2.6" fill="#fff" />
    <path d="M15 22h8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".55" />
  </svg>
</template>
