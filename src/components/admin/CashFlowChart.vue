<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun']

const chartData = ref({
  labels,
  datasets: [
    {
      label: 'Masuk',
      data: [85, 100, 110, 125, 130, 145],
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
      data: [40, 48, 52, 55, 50, 45],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.07)',
      fill: true,
      tension: 0.45,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    },
  ],
})

const chartOptions = ref({
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
        label: (ctx: any) => ` ${ctx.dataset.label}: Rp ${ctx.parsed.y}jt`,
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
      max: 160,
    },
  },
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
})
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3>Arus Kas 2024</h3>
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
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
