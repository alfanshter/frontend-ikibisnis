<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardList,
  ShieldCheck,
  FileText,
  BookOpen,
  DollarSign,
  ChevronRight,
  Settings,
  Shield,
  Receipt,
  ClipboardCheck,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  Scale,
  Package,
} from '@lucide/vue'

const route = useRoute()
const auth = useAuthStore()

const isActive = (path: string) => {
  if (path === '/admin') return route.path === '/admin'
  return route.path === path || route.path.startsWith(path + '/')
}

// ─── All menu groups with permission key ──────────────────
const allMenu = [
  {
    section: 'Utama',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin', permission: 'dashboard' },
    ],
  },
  {
    section: 'Sales',
    items: [
      { label: 'Database Client', icon: Users,          path: '/admin/clients',      permission: 'crm' },
      { label: 'CRM Client',      icon: Users,          path: '/admin/crm',          permission: 'crm' },
      { label: 'Form Survei',     icon: ClipboardCheck, path: '/admin/form-survei',  permission: 'survei' },
      { label: 'Penawaran Harga', icon: Receipt,        path: '/admin/penawaran',    permission: 'penawaran' },
    ],
  },
  {
    section: 'Operasional',
    items: [
      { label: 'Proyek',          icon: Briefcase,     path: '/admin/proyek',           permission: 'proyek' },
      { label: 'Log Pekerjaan',   icon: ClipboardList, path: '/admin/log-pekerjaan',    permission: 'log_pekerjaan' },
      { label: 'Master Part',     icon: Package,       path: '/admin/master-part',      permission: 'masterpart' },
      { label: 'Procurement',     icon: ShoppingCart,  path: '/admin/procurement',      permission: 'procurement' },
      { label: 'Quality Control', icon: ShieldCheck,   path: '/admin/quality-control',  permission: 'qc' },
    ],
  },
  {
    section: 'Keuangan',
    items: [
      { label: 'Invoice',   icon: FileText,   path: '/admin/invoice',   permission: 'invoice' },
      { label: 'Pembukuan', icon: BookOpen,   path: '/admin/pembukuan', permission: 'pembukuan' },
      { label: 'Arus Kas',  icon: TrendingUp, path: '/admin/arus-kas',  permission: 'arus_kas' },
      { label: 'Laba Rugi', icon: BarChart3,  path: '/admin/laba-rugi', permission: 'laba_rugi' },
      { label: 'Neraca',    icon: Scale,      path: '/admin/neraca',    permission: 'neraca' },
      { label: 'Fee Tim',   icon: DollarSign, path: '/admin/fee-tim',   permission: 'fee_tim' },
    ],
  },
  {
    section: 'Sistem',
    items: [
      { label: 'User Management', icon: Users,   path: '/admin/user-management', permission: 'user_mgmt' },
      { label: 'Role Management', icon: Shield,  path: '/admin/role-management', permission: 'role_mgmt' },
      { label: 'Document Numbering', icon: Settings, path: '/admin/document-numberings', permission: 'user_mgmt' },
      { label: 'Audit Log',       icon: ClipboardList, path: '/admin/audit-logs', permission: 'user_mgmt' },
    ],
  },
]

// ─── Filter menu based on permissions ────────────────────
const menu = computed(() =>
  allMenu
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => auth.can(item.permission, 'view')),
    }))
    .filter((group) => group.items.length > 0),
)
</script>

<template>
  <aside class="sidebar">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="logo-icon">PT</div>
      <div class="logo-text">
        <strong>PT Putra</strong>
        <span>Wisanggeni Satu</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <template v-for="group in menu" :key="group.section">
        <div class="nav-section-label">{{ group.section }}</div>
        <RouterLink
          v-for="item in group.items"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <component :is="item.icon" class="nav-icon" :size="16" />
          {{ item.label }}
          <ChevronRight v-if="isActive(item.path)" class="nav-arrow" :size="13" />
        </RouterLink>
      </template>
    </nav>

    <!-- Footer / User Info -->
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-user-avatar" :style="{ background: auth.userAvatarColor }">
          {{ auth.userInitials }}
        </div>
        <div class="sidebar-user-text">
          <strong>{{ auth.userName }}</strong>
          <span>{{ auth.userRole }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sidebar-user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #111;
  flex-shrink: 0;
}
.sidebar-user-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sidebar-user-text strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}
.sidebar-user-text span {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
