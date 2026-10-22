<script setup lang="ts">
import { ref } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const statuses = [
  { label: 'Berjalan',   count: 8,  color: '#f59e0b' },
  { label: 'Selesai',    count: 14, color: '#10b981' },
  { label: 'Penawaran',  count: 5,  color: '#3b82f6' },
  { label: 'Pending',    count: 3,  color: '#6b7280' },
]

const chartData = ref({
  labels: statuses.map(s => s.label),
  datasets: [{
    data: statuses.map(s => s.count),
    backgroundColor: statuses.map(s => s.color),
    borderColor: '#1a2235',
    borderWidth: 3,
    hoverOffset: 4,
  }],
})

const chartOptions = ref({
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
})
</script>

<template>
  <div class="chart-card">
    <div class="chart-card-header">
      <h3>Status Proyek</h3>
    </div>

    <div style="height: 160px; position: relative; display: flex; justify-content: center;">
      <Doughnut :data="chartData" :options="chartOptions" />
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
