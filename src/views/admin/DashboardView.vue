<script setup lang="ts">
import AdminLayout from '@/layouts/AdminLayout.vue'
import StatCard from '@/components/admin/StatCard.vue'
import CashFlowChart from '@/components/admin/CashFlowChart.vue'
import ProjectStatusChart from '@/components/admin/ProjectStatusChart.vue'
import ProjectTable from '@/components/admin/ProjectTable.vue'
import {
  Briefcase,
  CheckCircle,
  DollarSign,
  UserPlus,
} from '@lucide/vue'

const today = new Date().toLocaleDateString('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
</script>

<template>
  <AdminLayout>
    <!-- Page Header -->
    <div class="page-header">
      <h1>Selamat Datang, Admin</h1>
      <p>Ringkasan operasional PT Putra Wisanggeni Satu — {{ today }}</p>
    </div>

    <!-- Stat Cards -->
    <div class="stat-grid">
      <StatCard
        value="8"
        label="Total Proyek Aktif"
        subtext="+2 bulan ini"
        subtext-class="trend-up"
        trend-type="up"
        icon-bg-class="icon-orange"
      >
        <template #icon>
          <Briefcase :size="18" />
        </template>
      </StatCard>

      <StatCard
        value="14"
        label="Proyek Selesai"
        subtext="Tahun 2026"
        subtext-class="trend-up"
        trend-type="up"
        icon-bg-class="icon-green"
      >
        <template #icon>
          <CheckCircle :size="18" />
        </template>
      </StatCard>

      <StatCard
        value="Rp 110jt"
        label="Pendapatan Bulan ini"
        subtext="-33% vs Mei"
        subtext-class="trend-down"
        trend-type="down"
        icon-bg-class="icon-blue"
      >
        <template #icon>
          <DollarSign :size="18" />
        </template>
      </StatCard>

      <StatCard
        value="12"
        label="Leads Bulan ini"
        subtext="+4 vs bulan lalu"
        subtext-class="trend-up"
        trend-type="up"
        icon-bg-class="icon-purple"
      >
        <template #icon>
          <UserPlus :size="18" />
        </template>
      </StatCard>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <CashFlowChart />
      <ProjectStatusChart />
    </div>

    <!-- Project Table -->
    <ProjectTable />
  </AdminLayout>
</template>
