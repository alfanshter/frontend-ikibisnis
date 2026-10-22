<script setup lang="ts">
import { TrendingUp, TrendingDown, Minus } from '@lucide/vue'

interface Props {
  value: string
  label: string
  subtext: string
  subtextClass?: string
  iconBgClass?: string
  trendType?: 'up' | 'down' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  iconBgClass: 'icon-orange',
  subtextClass: 'trend-up',
  trendType: 'up',
})
</script>

<template>
  <div class="stat-card">
    <div class="stat-card-header">
      <div class="stat-icon" :class="iconBgClass">
        <slot name="icon" />
      </div>
      <div class="stat-trend" :class="subtextClass">
        <TrendingUp v-if="trendType === 'up'" :size="13" />
        <TrendingDown v-else-if="trendType === 'down'" :size="13" />
        <Minus v-else :size="13" />
      </div>
    </div>
    <div class="stat-value">{{ value }}</div>
    <div class="stat-label">{{ label }}</div>
    <div class="stat-sub" :class="subtextClass">{{ subtext }}</div>
  </div>
</template>
