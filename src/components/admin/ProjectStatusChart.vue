<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ProyekStatsResponse } from '@/services/api'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  stats: ProyekStatsResponse | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), { loading: false })

// Colour map per status
const STATUS_COLORS: Record<string, string> = {
  'Berjalan':      '#f59e0b',
  'Selesai':       '#10b981',
  'Belum Dimulai': '#6b7280',
  'QC':            '#3b82f6',
  'Serah Terima':  '#8b5cf6',
  'Hold':          '#ef4444',
}

const statuses = computed(() => {
  if (!props.stats) return []
  return props.stats.by_status
    .filter(s => s.count > 0)
    .map(s => ({
      label: s.status,
      count: s.count,
      color: STATUS_COLORS[s.status] ?? '#6b7280',
    }))
})

const chartData = computed(() => ({
  labels: statuses.value.map(s => s.label),
  datasets: [{
    data: statuses.value.map(s => s.count),
    backgroundColor: statuses.value.map(s => s.color),
    borderColor: '#1a2235',
    borderWidth: 3,
    hoverOffset: 4,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a2235',
      borderColor: '#1e2d45',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#8892a4',
      padding: 10,
    },
  },
}
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3>Status Proyek</h3>
      <span v-if="stats" style="font-size:12px;color:#8892a4;">Total: {{ stats.total }}</span>
    </div>

    <div style="height: 160px; position: relative; display: flex; justify-content: center;">
      <div
        v-if="loading"
        style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8892a4;font-size:13px;"
      >
        Memuat data…
      </div>
      <div
        v-else-if="!statuses.length"
        style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8892a4;font-size:13px;"
      >
        Belum ada data proyek
      </div>
      <Doughnut v-else :data="chartData" :options="chartOptions" />
    </div>

    <div class="status-list">
      <div v-for="s in statuses" :key="s.label" class="status-item">
        <div class="status-item-left">
          <div class="status-dot" :style="{ background: s.color }"></div>
          <span class="status-name">{{ s.label }}</span>
        </div>
        <span class="status-count">{{ s.count }}</span>
      </div>
    </div>
  </div>
</template>
