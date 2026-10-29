<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { proyeksApi, type ProyekResponse } from '@/services/api'

const router = useRouter()
const projects = ref<ProyekResponse[]>([])
const total = ref(0)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await proyeksApi.list({ page: 1 })
    projects.value = res.data
    total.value = res.meta.total
  } catch {
    // silent
  } finally {
    loading.value = false
  }
})

const badgeClass = (status: string) => {
  const map: Record<string, string> = {
    Berjalan:        'badge badge-berjalan',
    Selesai:         'badge badge-selesai',
    Penawaran:       'badge badge-penawaran',
    'Belum Dimulai': 'badge badge-pending',
    QC:              'badge badge-qc',
    'Serah Terima':  'badge badge-qc',
    Hold:            'badge badge-pending',
  }
  return map[status] ?? 'badge'
}

const progressColor = (p: number) => {
  if (p >= 90) return '#10b981'
  if (p >= 50) return '#f59e0b'
  return '#3b82f6'
}
</script>

<template>
  <div class="table-card">
    <div class="table-header">
      <h3>Proyek Terkini</h3>
      <span class="table-header-sub">
        {{ loading ? '…' : `${projects.length} dari ${total} proyek` }}
      </span>
    </div>

    <div
      v-if="loading"
      style="padding:32px;text-align:center;color:#8892a4;font-size:13px;"
    >
      Memuat data proyek…
    </div>

    <div
      v-else-if="!projects.length"
      style="padding:32px;text-align:center;color:#8892a4;font-size:13px;"
    >
      Belum ada proyek
    </div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Kode</th>
          <th>Nama Proyek</th>
          <th>Client</th>
          <th>Nilai</th>
          <th>Status</th>
          <th>Progress</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in projects"
          :key="p.id"
          style="cursor:pointer;"
          @click="router.push(`/admin/proyek/${p.id}`)"
        >
          <td><span class="project-id">{{ p.kode }}</span></td>
          <td><span class="project-name">{{ p.nama }}</span></td>
          <td><span class="project-client">{{ p.client_nama || '—' }}</span></td>
          <td><span class="project-value">{{ p.nilai_format }}</span></td>
          <td><span :class="badgeClass(p.status)">{{ p.status }}</span></td>
          <td>
            <div class="progress-wrap">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{
                    width: p.progress + '%',
                    background: `linear-gradient(90deg, ${progressColor(p.progress)}, ${progressColor(p.progress)}aa)`
                  }"
                ></div>
              </div>
              <span class="progress-label">{{ p.progress }}%</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
