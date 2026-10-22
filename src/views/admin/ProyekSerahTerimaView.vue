<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import SignaturePad from '@/components/SignaturePad.vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  ArrowLeft, Plus, CheckCircle2, FileText, Image as ImageIcon,
  Trash2, Download, AlertCircle, Save
} from '@lucide/vue'

import { 
  proyekSerahTerimaApi, 
  proyeksApi,
  proyekQcApi,
  type ProyekResponse,
  type ProyekSerahTerimaResponse,
  type ProyekQcResponse,
  type STChecklist,
  type STEquipment,
  type STPunchList
} from '@/services/api'

const route = useRoute()
const router = useRouter()
const proyekId = Number(route.params.id)

// State
const proyek = ref<ProyekResponse | null>(null)
const qcData = ref<ProyekQcResponse | null>(null)
const stData = ref<ProyekSerahTerimaResponse | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

// Forms
const editPicPws = ref(false)
const editPicClient = ref(false)
const editDate = ref(false)

async function fetchData() {
  loading.value = true
  try {
    const [pRes, stRes, qcRes] = await Promise.all([
      proyeksApi.show(proyekId),
      proyekSerahTerimaApi.get(proyekId),
      proyekQcApi.get(proyekId).catch(() => ({ data: null }))
    ])
    proyek.value = pRes.data
    stData.value = stRes.data
    if (qcRes.data) qcData.value = qcRes.data
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat data serah terima'
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())

// Status styling
const statusClass = (s: string) => ({
  'Draft': 'badge-st-draft',
  'Menunggu Tanda Tangan': 'badge-st-menunggu',
  'Diterima': 'badge-st-diterima',
  'Diterima dengan Catatan': 'badge-st-catatan',
  'Revisi': 'badge-st-revisi',
  'Selesai': 'badge-st-selesai',
}[s] || 'badge-st-draft')

// Update General Info
const updateInfo = async (payload: Partial<ProyekSerahTerimaResponse>) => {
  saving.value = true
  try {
    const res = await proyekSerahTerimaApi.update(proyekId, payload)
    stData.value = res.data
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan info')
  } finally {
    saving.value = false
  }
}

// Checklist logic
const addChecklist = () => {
  if (stData.value) {
    stData.value.checklists.push({ text: '', status: null, catatan: null })
  }
}
const removeChecklist = (idx: number) => {
  if (stData.value) stData.value.checklists.splice(idx, 1)
}
const saveChecklists = async () => {
  if (!stData.value) return
  saving.value = true
  try {
    const res = await proyekSerahTerimaApi.updateChecklists(proyekId, stData.value.checklists)
    stData.value = res.data
    alert('Checklist disimpan')
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan checklist')
  } finally {
    saving.value = false
  }
}

// Equipment logic
const addEquipment = () => {
  if (stData.value) {
    stData.value.equipments.push({ nama_item: '', qty: 1, unit: 'Unit', kondisi: 'Baik' })
  }
}
const removeEquipment = (idx: number) => {
  if (stData.value) stData.value.equipments.splice(idx, 1)
}
const saveEquipments = async () => {
  if (!stData.value) return
  saving.value = true
  try {
    const res = await proyekSerahTerimaApi.updateEquipments(proyekId, stData.value.equipments)
    stData.value = res.data
    alert('Equipment disimpan')
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan equipment')
  } finally {
    saving.value = false
  }
}

// Punch List logic
const addPunchList = () => {
  if (stData.value) {
    stData.value.punch_lists.push({ temuan: '', status: 'Open' })
  }
}
const removePunchList = (idx: number) => {
  if (stData.value) stData.value.punch_lists.splice(idx, 1)
}
const savePunchLists = async () => {
  if (!stData.value) return
  saving.value = true
  try {
    const res = await proyekSerahTerimaApi.updatePunchLists(proyekId, stData.value.punch_lists)
    stData.value = res.data
    alert('Punch list disimpan')
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan punch list')
  } finally {
    saving.value = false
  }
}

// Files & Photos
const docFile = ref<File | null>(null)
const docName = ref('')
const handleDocUpload = async () => {
  if (!docFile.value || !docName.value) return
  const fd = new FormData()
  fd.append('file', docFile.value)
  fd.append('nama_dokumen', docName.value)
  saving.value = true
  try {
    const res = await proyekSerahTerimaApi.uploadDocument(proyekId, fd)
    stData.value = res.data
    docFile.value = null
    docName.value = ''
  } catch (e: any) {
    alert(e.message || 'Gagal upload')
  } finally {
    saving.value = false
  }
}
const deleteDoc = async (id: number) => {
  if (confirm('Hapus dokumen ini?')) {
    const res = await proyekSerahTerimaApi.deleteDocument(proyekId, id)
    stData.value = res.data
  }
}

// Signatures
const onSaveTtdPws = async (base64: string) => {
  saving.value = true
  try {
    const res = await proyekSerahTerimaApi.saveSignatures(proyekId, { ttd_pws: base64 })
    stData.value = res.data
  } catch (e: any) {
    alert(e.message)
  } finally {
    saving.value = false
  }
}
const onSaveTtdClient = async (base64: string) => {
  saving.value = true
  try {
    const res = await proyekSerahTerimaApi.saveSignatures(proyekId, { ttd_client: base64 })
    stData.value = res.data
  } catch (e: any) {
    alert(e.message)
  } finally {
    saving.value = false
  }
}

// Validation & Complete
const canComplete = computed(() => {
  if (!stData.value) return false
  const hasOpenPunch = stData.value.punch_lists.some(p => p.status === 'Open')
  const hasTtdClient = !!stData.value.ttd_client
  return !hasOpenPunch && hasTtdClient
})

const completeHandover = async () => {
  if (!canComplete.value) return alert('Selesaikan syarat sebelum menyetujui serah terima')
  if (!confirm('Anda yakin ingin memfinalisasi serah terima? Status proyek akan berubah menjadi Selesai.')) return
  
  saving.value = true
  try {
    const res = await proyekSerahTerimaApi.complete(proyekId)
    stData.value = res.data
    alert('Serah Terima Selesai!')
    router.push(`/admin/proyek/${proyekId}`)
  } catch (e: any) {
    alert(e.message || 'Gagal menyelesaikan serah terima')
  } finally {
    saving.value = false
  }
}

// Generate BAST PDF
const generatePDF = () => {
  if (!stData.value || !proyek.value) return
  const doc = new jsPDF()
  const d = stData.value
  
  doc.setFontSize(16)
  doc.text('BERITA ACARA SERAH TERIMA PEKERJAAN', 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text(`Nomor: ${d.nomor_bast || 'DRAFT'}`, 105, 28, { align: 'center' })
  
  doc.setFontSize(10)
  doc.text(`Pada hari ini, tanggal ${d.tanggal || '-'}, telah dilakukan serah terima pekerjaan untuk proyek:`, 14, 45)
  
  doc.text(`Nama Proyek : ${proyek.value.nama_proyek}`, 14, 55)
  doc.text(`Client      : ${d.pic_client_nama || '-'} (${d.pic_client_jabatan || '-'})`, 14, 61)
  doc.text(`Pelaksana   : PT Putra Wisanggeni Satu`, 14, 67)
  
  doc.text('Dengan rincian hasil pekerjaan sebagai berikut:', 14, 80)
  
  // Equipments
  autoTable(doc, {
    startY: 85,
    head: [['No', 'Item', 'Qty', 'SN', 'Kondisi']],
    body: d.equipments.map((e, i) => [i + 1, e.nama_item, `${e.qty} ${e.unit}`, e.sn || '-', e.kondisi]),
    theme: 'grid',
    styles: { fontSize: 9 }
  })
  
  let finalY = (doc as any).lastAutoTable.finalY + 10
  
  // TTD
  doc.text('Pihak Client', 40, finalY)
  doc.text('PT Putra Wisanggeni Satu', 130, finalY)
  
  if (d.ttd_client) {
    doc.addImage(d.ttd_client, 'PNG', 30, finalY + 5, 40, 20)
  }
  if (d.ttd_pws) {
    doc.addImage(d.ttd_pws, 'PNG', 130, finalY + 5, 40, 20)
  }
  
  doc.text(`(${d.pic_client_nama || '..................'})`, 40, finalY + 35)
  doc.text(`(..................)`, 130, finalY + 35)
  
  doc.save(`BAST-${proyek.value.nama_proyek}.pdf`)
}

</script>

<template>
  <AdminLayout title="Detail Serah Terima">
    <div class="px-6 py-6" v-if="loading">Loading...</div>
    <div class="px-6 py-6 max-w-7xl mx-auto" v-else-if="stData && proyek">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <button @click="router.push(`/admin/proyek/${proyekId}`)" class="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
            <ArrowLeft class="w-6 h-6" />
          </button>
          <div>
            <h1 class="text-2xl font-bold text-white tracking-tight">Serah Terima Pekerjaan</h1>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <span class="text-slate-400">{{ proyek.nama_proyek }}</span>
              <span class="text-slate-600">•</span>
              <span class="text-slate-400">{{ stData.nomor_bast || 'Belum ada BAST' }}</span>
              <span class="text-slate-600">•</span>
              <span :class="['px-2 py-0.5 rounded-full text-xs font-medium border', statusClass(stData.status)]">
                {{ stData.status }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="generatePDF" class="px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors font-medium flex items-center gap-2">
            <Download class="w-4 h-4" /> BAST PDF
          </button>
          <button v-if="stData.status !== 'Selesai'" @click="completeHandover" :disabled="!canComplete" :class="[
            'px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors',
            canComplete ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          ]">
            <CheckCircle2 class="w-4 h-4" /> Selesaikan Serah Terima
          </button>
        </div>
      </div>

      <!-- Info Card -->
      <div class="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">Informasi Serah Terima</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Tanggal</label>
            <input type="date" v-model="stData.tanggal" @change="updateInfo({ tanggal: stData.tanggal })" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">PIC Client</label>
            <input type="text" v-model="stData.pic_client_nama" @blur="updateInfo({ pic_client_nama: stData.pic_client_nama })" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Jabatan PIC Client</label>
            <input type="text" v-model="stData.pic_client_jabatan" @blur="updateInfo({ pic_client_jabatan: stData.pic_client_jabatan })" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white" />
          </div>
        </div>
      </div>
      
      <!-- Hasil Pekerjaan -->
      <div class="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">Hasil Pekerjaan</h2>
        <textarea v-model="stData.hasil_pekerjaan" @blur="updateInfo({ hasil_pekerjaan: stData.hasil_pekerjaan })" rows="3" class="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent-orange focus:ring-1 focus:ring-accent-orange" placeholder="Jelaskan ringkasan hasil pekerjaan yang diserahterimakan..."></textarea>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Checklist -->
        <div class="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col h-full">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-white">Checklist Pekerjaan</h2>
            <button @click="saveChecklists" class="text-xs px-3 py-1 bg-slate-800 text-white rounded-md hover:bg-slate-700">Simpan</button>
          </div>
          <div class="space-y-3 flex-1">
            <div v-for="(chk, idx) in stData.checklists" :key="idx" class="flex flex-col gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div class="flex items-center gap-3">
                <input type="text" v-model="chk.text" class="flex-1 bg-transparent border-none text-white focus:outline-none" placeholder="Item checklist" />
                <select v-model="chk.status" class="bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 py-1">
                  <option :value="null">- Status -</option>
                  <option>OK</option>
                  <option>OK dengan Catatan</option>
                  <option>Tidak OK</option>
                </select>
                <button @click="removeChecklist(idx)" class="text-slate-500 hover:text-red-400"><Trash2 class="w-4 h-4" /></button>
              </div>
              <input v-if="chk.status === 'OK dengan Catatan' || chk.status === 'Tidak OK'" type="text" v-model="chk.catatan" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-300" placeholder="Catatan..." />
            </div>
            <button @click="addChecklist" class="w-full py-2 border border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition flex items-center justify-center gap-2 text-sm">
              <Plus class="w-4 h-4" /> Tambah Checklist
            </button>
          </div>
        </div>

        <!-- Punch List -->
        <div class="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col h-full">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-white">Catatan / Punch List</h2>
            <button @click="savePunchLists" class="text-xs px-3 py-1 bg-slate-800 text-white rounded-md hover:bg-slate-700">Simpan</button>
          </div>
          <div class="space-y-3 flex-1">
            <div v-for="(pl, idx) in stData.punch_lists" :key="idx" class="flex flex-col gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div class="flex items-center gap-3">
                <input type="text" v-model="pl.temuan" class="flex-1 bg-transparent border-none text-white focus:outline-none" placeholder="Temuan/Catatan" />
                <select v-model="pl.status" class="bg-slate-900 border border-slate-700 rounded text-sm text-slate-300 py-1">
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
                <button @click="removePunchList(idx)" class="text-slate-500 hover:text-red-400"><Trash2 class="w-4 h-4" /></button>
              </div>
            </div>
            <button @click="addPunchList" class="w-full py-2 border border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition flex items-center justify-center gap-2 text-sm">
              <Plus class="w-4 h-4" /> Tambah Punch List
            </button>
          </div>
        </div>
      </div>
      
      <!-- Equipments -->
      <div class="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-white">Equipment yang Diserahterimakan</h2>
          <button @click="saveEquipments" class="text-xs px-3 py-1 bg-slate-800 text-white rounded-md hover:bg-slate-700">Simpan</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="text-xs uppercase bg-slate-800/50 text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-tl-lg">Item</th>
                <th class="px-4 py-3">Qty</th>
                <th class="px-4 py-3">Unit</th>
                <th class="px-4 py-3">S/N</th>
                <th class="px-4 py-3">Kondisi</th>
                <th class="px-4 py-3 rounded-tr-lg w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(eq, idx) in stData.equipments" :key="idx" class="border-b border-slate-800 last:border-0 hover:bg-slate-800/30">
                <td class="px-4 py-2"><input type="text" v-model="eq.nama_item" class="w-full bg-transparent text-white border border-slate-700 rounded px-2" /></td>
                <td class="px-4 py-2"><input type="number" v-model="eq.qty" class="w-16 bg-transparent text-white border border-slate-700 rounded px-2" /></td>
                <td class="px-4 py-2"><input type="text" v-model="eq.unit" class="w-20 bg-transparent text-white border border-slate-700 rounded px-2" /></td>
                <td class="px-4 py-2"><input type="text" v-model="eq.sn" class="w-full bg-transparent text-white border border-slate-700 rounded px-2" /></td>
                <td class="px-4 py-2">
                  <select v-model="eq.kondisi" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-32">
                    <option>Baik</option>
                    <option>Baik dengan Catatan</option>
                    <option>Rusak</option>
                    <option>Tidak Ada</option>
                  </select>
                </td>
                <td class="px-4 py-2 text-center"><button @click="removeEquipment(idx)" class="text-slate-500 hover:text-red-400"><Trash2 class="w-4 h-4" /></button></td>
              </tr>
            </tbody>
          </table>
          <button @click="addEquipment" class="w-full mt-3 py-2 border border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition flex items-center justify-center gap-2 text-sm">
            <Plus class="w-4 h-4" /> Tambah Equipment
          </button>
        </div>
      </div>
      
      <!-- Documents -->
      <div class="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">Dokumen Pendukung</h2>
        <div class="flex gap-4 mb-4 items-center">
          <input type="text" v-model="docName" placeholder="Nama Dokumen (BAST, As-Built, dll)" class="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm w-64" />
          <input type="file" @change="(e) => docFile = (e.target as HTMLInputElement).files?.[0] || null" class="text-sm text-slate-400" />
          <button @click="handleDocUpload" class="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm">Upload</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="doc in stData.documents" :key="doc.id" class="p-4 bg-slate-800/50 rounded-xl border border-slate-700 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <FileText class="w-8 h-8 text-slate-400" />
              <div>
                <p class="text-sm text-white font-medium truncate w-32">{{ doc.nama_dokumen }}</p>
                <a :href="doc.file_url" target="_blank" class="text-xs text-accent-orange hover:underline">Download</a>
              </div>
            </div>
            <button @click="deleteDoc(doc.id)" class="text-slate-500 hover:text-red-400 p-2"><Trash2 class="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      
      <!-- Signatures -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl text-center">
          <h3 class="text-white font-medium mb-1">Pihak Client</h3>
          <p class="text-slate-400 text-sm mb-4">{{ stData.pic_client_nama || 'Belum diisi' }}</p>
          <div v-if="stData.ttd_client" class="bg-white rounded-xl p-4 inline-block mb-4">
            <img :src="stData.ttd_client" alt="TTD Client" class="h-24 object-contain" />
          </div>
          <SignaturePad v-else @save="onSaveTtdClient" />
        </div>
        
        <div class="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl text-center">
          <h3 class="text-white font-medium mb-1">Pihak PWS</h3>
          <p class="text-slate-400 text-sm mb-4">Tim Putra Wisanggeni Satu</p>
          <div v-if="stData.ttd_pws" class="bg-white rounded-xl p-4 inline-block mb-4">
            <img :src="stData.ttd_pws" alt="TTD PWS" class="h-24 object-contain" />
          </div>
          <SignaturePad v-else @save="onSaveTtdPws" />
        </div>
      </div>
      
    </div>
  </AdminLayout>
</template>

<style scoped>
.glass-panel {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.badge-st-draft { color: #94a3b8; border-color: rgba(148, 163, 184, 0.3); background: rgba(148, 163, 184, 0.1); }
.badge-st-menunggu { color: #eab308; border-color: rgba(234, 179, 8, 0.3); background: rgba(234, 179, 8, 0.1); }
.badge-st-diterima, .badge-st-selesai { color: #22c55e; border-color: rgba(34, 197, 94, 0.3); background: rgba(34, 197, 94, 0.1); }
.badge-st-catatan { color: #f97316; border-color: rgba(249, 115, 22, 0.3); background: rgba(249, 115, 22, 0.1); }
.badge-st-revisi { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); }
</style>
