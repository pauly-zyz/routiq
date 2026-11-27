<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 30 })
const id = useId()
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true" class="shrink-0">
    <defs>
      <linearGradient :id="`bm-${id}`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0E2E28" />
        <stop offset=".55" stop-color="#081B16" />
        <stop offset="1" stop-color="#041210" />
      </linearGradient>
      <radialGradient :id="`bh-${id}`" cx=".25" cy=".2" r=".8">
        <stop offset="0" stop-color="#97FCE4" stop-opacity=".3" />
        <stop offset="1" stop-color="#97FCE4" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="32" height="32" rx="9" :fill="`url(#bm-${id})`" />
    <rect width="32" height="32" rx="9" :fill="`url(#bh-${id})`" />
    <rect x=".4" y=".4" width="31.2" height="31.2" rx="8.6" fill="none" stroke="#97FCE4" stroke-opacity=".35" stroke-width=".8" />
    <ellipse cx="23" cy="10" rx="6.4" ry="2.5" transform="rotate(-24 23 10)" fill="none" stroke="#97FCE4" stroke-opacity=".35" stroke-width=".9" />
    <path d="M9 22V14a4 4 0 0 1 4-4h10" fill="none" stroke="#97FCE4" stroke-width="2.4" stroke-linecap="round" />
    <circle cx="9" cy="22" r="2.6" fill="#97FCE4" />
    <circle cx="23" cy="10" r="2.6" fill="#97FCE4" />
    <path d="M15 22h8" stroke="#97FCE4" stroke-width="2.4" stroke-linecap="round" opacity=".5" />
  </svg>
</template>
