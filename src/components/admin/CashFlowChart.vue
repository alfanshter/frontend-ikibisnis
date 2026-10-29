<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import type { TransactionStatsResponse } from '@/services/api'
import { formatRp } from '@/utils/currency'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

interface Props {
  stats: TransactionStatsResponse | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), { loading: false })

const chartYear = computed(() => {
  if (!props.stats || !props.stats.chart_data.length) return new Date().getFullYear()
  const last = props.stats.chart_data[props.stats.chart_data.length - 1]
  return last.raw_year
})

const chartData = computed(() => {
  const data = props.stats?.chart_data ?? []
  const labels = data.map(d => d.month)
  const masukData = data.map(d => d.masuk_jt)
  const keluarData = data.map(d => d.keluar_jt)
  return {
    labels,
    datasets: [
      {
        label: 'Masuk',
        data: masukData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.12)',
        fill: true,
        tension: 0.45,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2.5,
      },
      {
        label: 'Keluar',
        data: keluarData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.07)',
        fill: true,
        tension: 0.45,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  }
})

const maxVal = computed(() => {
  if (!props.stats?.chart_data.length) return 160
  const allVals = props.stats.chart_data.flatMap(d => [d.masuk_jt, d.keluar_jt])
  const mx = Math.max(...allVals)
  return mx > 0 ? Math.ceil(mx * 1.2 / 10) * 10 : 160
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a2235',
      borderColor: '#1e2d45',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#8892a4',
      padding: 10,
      callbacks: {
        label: (ctx: any) => {
          const d = props.stats?.chart_data?.[ctx.dataIndex]
          if (d) {
            const rawVal = ctx.datasetIndex === 0 ? d.masuk : d.keluar
            return ` ${ctx.dataset.label}: ${formatRp(rawVal)}`
          }
          return ` ${ctx.dataset.label}: ${formatRp((ctx.parsed.y || 0) * 1_000_000)}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: '#8892a4', font: { size: 11 } },
      border: { display: false },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: {
        color: '#8892a4',
        font: { size: 11 },
        callback: (v: any) => `${v}jt`,
      },
      border: { display: false },
      min: 0,
      max: maxVal.value,
    },
  },
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
}))
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3>Arus Kas {{ chartYear }}</h3>
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-dot" style="background:#f59e0b"></div>
          Masuk
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background:#3b82f6"></div>
          Keluar
        </div>
      </div>
    </div>
    <div style="height: 200px; position: relative;">
      <div
        v-if="loading"
        style="height:100%;display:flex;align-items:center;justify-content:center;color:#8892a4;font-size:13px;"
      >
        Memuat data…
      </div>
      <div
        v-else-if="!stats || !stats.chart_data.length"
        style="height:100%;display:flex;align-items:center;justify-content:center;color:#8892a4;font-size:13px;"
      >
        Belum ada data arus kas
      </div>
      <Line v-else :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
