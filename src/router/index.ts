import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── Public ────────────────────────────────────────────────
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },

    // ── Admin — no specific permission (auth only) ─────────────
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('@/views/admin/DashboardView.vue'),
      meta: { requiresAuth: true, permission: 'dashboard' },
    },
    {
      path: '/admin/forbidden',
      name: 'admin-forbidden',
      component: () => import('@/views/admin/ForbiddenView.vue'),
      meta: { requiresAuth: true },
    },

    // ── Sales ─────────────────────────────────────────────────
    {
      path: '/admin/clients',
      name: 'admin-clients',
      component: () => import('@/views/admin/ClientView.vue'),
      meta: { requiresAuth: true, permission: 'crm' },
    },
    {
      path: '/admin/crm',
      name: 'admin-crm',
      component: () => import('@/views/admin/CrmView.vue'),
      meta: { requiresAuth: true, permission: 'crm' },
    },
    {
      path: '/admin/crm/:id',
      name: 'admin-crm-detail',
      component: () => import('@/views/admin/CrmDetailView.vue'),
      meta: { requiresAuth: true, permission: 'crm' },
    },
    {
      path: '/admin/form-survei',
      name: 'admin-form-survei',
      component: () => import('@/views/admin/FormSurveiView.vue'),
      meta: { requiresAuth: true, permission: 'survei' },
    },
    {
      path: '/admin/form-survei/:id',
      name: 'admin-form-survei-detail',
      component: () => import('@/views/admin/FormSurveiDetailView.vue'),
      meta: { requiresAuth: true, permission: 'survei' },
    },
    {
      path: '/admin/penawaran',
      name: 'admin-penawaran',
      component: () => import('@/views/admin/PenawaranView.vue'),
      meta: { requiresAuth: true, permission: 'penawaran' },
    },
    {
      path: '/admin/penawaran/:id',
      name: 'admin-penawaran-detail',
      component: () => import('@/views/admin/PenawaranDetailView.vue'),
      meta: { requiresAuth: true, permission: 'penawaran' },
    },

    // ── Operasional ───────────────────────────────────────────
    {
      path: '/admin/proyek',
      name: 'admin-proyek',
      component: () => import('@/views/admin/ProyekView.vue'),
      meta: { requiresAuth: true, permission: 'proyek' },
    },
    {
      path: '/admin/proyek/:id',
      name: 'admin-detail-proyek',
      component: () => import('@/views/admin/DetailProyekView.vue'),
      meta: { requiresAuth: true, permission: 'proyek' },
    },
    {
      path: '/admin/proyek/:id/pekerjaan',
      name: 'admin-proyek-pekerjaan',
      component: () => import('@/views/admin/ProyekPekerjaanView.vue'),
      meta: { requiresAuth: true, permission: 'proyek' },
    },
    {
      path: '/admin/proyek/:id/qc',
      name: 'admin-proyek-qc',
      component: () => import('@/views/admin/ProyekQcView.vue'),
      meta: { requiresAuth: true, permission: 'proyek' },
    },
    {
      path: '/admin/proyek/:id/serah-terima',
      name: 'admin-proyek-serah-terima',
      component: () => import('@/views/admin/ProyekSerahTerimaView.vue'),
      meta: { requiresAuth: true, permission: 'proyek' },
    },
    {
      path: '/admin/proyek/:id/procurement',
      name: 'admin-proyek-procurement',
      component: () => import('@/views/admin/ProyekProcurementView.vue'),
      meta: { requiresAuth: true, permission: 'proyek' },
    },
    {
      path: '/admin/proyek/:id/fee-tim',
      name: 'admin-proyek-fee-tim',
      component: () => import('@/views/admin/ProyekFeeTimView.vue'),
      meta: { requiresAuth: true, permission: 'proyek' },
    },
    {
      path: '/admin/proyek/:id/biaya-lain',
      name: 'admin-proyek-biaya-lain',
      component: () => import('@/views/admin/ProyekBiayaLainView.vue'),
      meta: { requiresAuth: true, permission: 'proyek' },
    },
    {
      path: '/admin/proyek/:id/invoice',
      name: 'admin-proyek-invoice',
      component: () => import('@/views/admin/ProyekInvoiceView.vue'),
      meta: { requiresAuth: true, permission: 'proyek' },
    },
    {
      path: '/admin/log-pekerjaan',
      name: 'admin-log',
      component: () => import('@/views/admin/LogPekerjaanView.vue'),
      meta: { requiresAuth: true, permission: 'log_pekerjaan' },
    },
    {
      path: '/admin/master-part',
      name: 'admin-master-part',
      component: () => import('@/views/admin/MasterPartView.vue'),
      meta: { requiresAuth: true, permission: 'procurement' },
    },
    {
      path: '/admin/procurement',
      name: 'admin-procurement',
      component: () => import('@/views/admin/ProcurementView.vue'),
      meta: { requiresAuth: true, permission: 'procurement' },
    },
    {
      path: '/admin/quality-control',
      name: 'admin-qc',
      component: () => import('@/views/admin/QcView.vue'),
      meta: { requiresAuth: true, permission: 'qc' },
    },
    {
      path: '/admin/document-numberings',
      name: 'admin-document-numberings',
      component: () => import('@/views/admin/DocumentNumberingView.vue'),
      meta: { requiresAuth: true, permission: 'qc' },
    },

    // ── Keuangan ──────────────────────────────────────────────
    {
      path: '/admin/invoice',
      name: 'admin-invoice',
      component: () => import('@/views/admin/InvoiceView.vue'),
      meta: { requiresAuth: true, permission: 'invoice' },
    },
    {
      path: '/admin/pembukuan',
      name: 'admin-pembukuan',
      component: () => import('@/views/admin/PembukuanView.vue'),
      meta: { requiresAuth: true, permission: 'pembukuan' },
    },
    {
      path: '/admin/arus-kas',
      name: 'admin-arus-kas',
      component: () => import('@/views/admin/ArusKasView.vue'),
      meta: { requiresAuth: true, permission: 'arus_kas' },
    },
    {
      path: '/admin/laba-rugi',
      name: 'admin-laba-rugi',
      component: () => import('@/views/admin/LabaRugiView.vue'),
      meta: { requiresAuth: true, permission: 'laba_rugi' },
    },
    {
      path: '/admin/neraca',
      name: 'admin-neraca',
      component: () => import('@/views/admin/NeracaView.vue'),
      meta: { requiresAuth: true, permission: 'neraca' },
    },
    {
      path: '/admin/fee-tim',
      name: 'admin-fee-tim',
      component: () => import('@/views/admin/FeeTimView.vue'),
      meta: { requiresAuth: true, permission: 'fee_tim' },
    },

    // ── Sistem ────────────────────────────────────────────────
    {
      path: '/admin/user-management',
      name: 'admin-user-management',
      component: () => import('@/views/admin/UserManagementView.vue'),
      meta: { requiresAuth: true, permission: 'user_mgmt' },
    },
    {
      path: '/admin/role-management',
      name: 'admin-role-management',
      component: () => import('@/views/admin/RoleManagementView.vue'),
      meta: { requiresAuth: true, permission: 'role_mgmt' },
    },
    {
      path: '/admin/audit-logs',
      name: 'admin-audit-logs',
      component: () => import('@/views/admin/AuditLogView.vue'),
      meta: { requiresAuth: true, permission: 'user_mgmt' }, // we reused user_mgmt permission for audit log
    },
  ],
})

// ─── Navigation Guard ────────────────────────────────────────────────────────

/** Ordered list of module → route-name fallbacks for smart redirect */
const MODULE_ROUTE_MAP: { permission: string; name: string }[] = [
  { permission: 'dashboard', name: 'admin-dashboard' },
  { permission: 'crm', name: 'admin-crm' },
  { permission: 'survei', name: 'admin-form-survei' },
  { permission: 'penawaran', name: 'admin-penawaran' },
  { permission: 'proyek', name: 'admin-proyek' },
  { permission: 'log_pekerjaan', name: 'admin-log' },
  { permission: 'procurement', name: 'admin-procurement' },
  { permission: 'qc', name: 'admin-qc' },
  { permission: 'invoice', name: 'admin-invoice' },
  { permission: 'pembukuan', name: 'admin-pembukuan' },
  { permission: 'arus_kas', name: 'admin-arus-kas' },
  { permission: 'laba_rugi', name: 'admin-laba-rugi' },
  { permission: 'neraca', name: 'admin-neraca' },
  { permission: 'fee_tim', name: 'admin-fee-tim' },
  { permission: 'user_mgmt', name: 'admin-user-management' },
  { permission: 'role_mgmt', name: 'admin-role-management' },
]

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Restore user session from token on first visit
  if (auth.isLoggedIn && !auth.user) {
    await auth.fetchMe()
  }

  // Not logged in → redirect to login
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' }
  }

  // Already logged in → redirect away from guest-only and root pages
  if ((to.meta.requiresGuest || to.path === '/') && auth.isLoggedIn) {
    // Find the first page the user can actually view
    const firstAllowed = MODULE_ROUTE_MAP.find((m) => auth.can(m.permission, 'view'))
    return firstAllowed ? { name: firstAllowed.name } : { name: 'login' }
  }

  // Permission check — only for authenticated routes with a permission key
  if (to.meta.requiresAuth && to.meta.permission && auth.isLoggedIn) {
    const permission = to.meta.permission as string
    if (!auth.can(permission, 'view')) {
      return { name: 'admin-forbidden' }
    }
  }
})

// Extend vue-router's RouteMeta to include our custom fields
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    permission?: string
  }
}

export default router
