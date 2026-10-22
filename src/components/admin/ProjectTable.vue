<script setup lang="ts">
interface Project {
  id: string
  name: string
  client: string
  value: string
  status: 'Berjalan' | 'Selesai' | 'Penawaran' | 'Pending' | 'QC'
  progress: number
}

const projects: Project[] = [
  { id: 'P#S-2024-031', name: 'CCTV Warehouse Surabaya',    client: 'PT Logistics Indo',  value: 'Rp85.000.000', status: 'Berjalan',  progress: 65 },
  { id: 'P#S-2024-032', name: 'Access Control Office CBD',  client: 'CV Maju Bersama',    value: 'Rp45.000.000', status: 'QC',        progress: 90 },
  { id: 'P#S-2024-033', name: 'Instalasi CCTV Bandara',    client: 'PT Angkasa Pura',     value: 'Rp120.000.000',status: 'Berjalan',  progress: 40 },
  { id: 'P#S-2024-034', name: 'Security System Hotel Bali', client: 'Bali Resort Group',  value: 'Rp78.000.000', status: 'Penawaran', progress: 0  },
  { id: 'P#S-2024-035', name: 'CCTV Pabrik Bekasi',        client: 'PT Manufaktur Jaya',  value: 'Rp55.000.000', status: 'Selesai',   progress: 100},
]

const badgeClass = (status: string) => {
  const map: Record<string, string> = {
    Berjalan: 'badge badge-berjalan',
    Selesai:  'badge badge-selesai',
    Penawaran:'badge badge-penawaran',
    Pending:  'badge badge-pending',
    QC:       'badge badge-qc',
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
      <span class="table-header-sub">5 dari 8 aktif</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>ID Proyek</th>
          <th>Nama Proyek</th>
          <th>Client</th>
          <th>Nilai</th>
          <th>Status</th>
          <th>Progress</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in projects" :key="p.id">
          <td><span class="project-id">{{ p.id }}</span></td>
          <td><span class="project-name">{{ p.name }}</span></td>
          <td><span class="project-client">{{ p.client }}</span></td>
          <td><span class="project-value">{{ p.value }}</span></td>
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
