<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, LogOut, ChevronDown, Loader2 } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const emit = defineEmits(['toggle-sidebar'])

const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const logoutLoading = ref(false)

const pageTitle = computed(() => {
  const map: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/crm': 'CRM Client',
    '/admin/form-survei': 'Form Survei',
    '/admin/penawaran': 'Penawaran Harga',
    '/admin/proyek': 'Proyek',
    '/admin/log-pekerjaan': 'Log Pekerjaan',
    '/admin/quality-control': 'Quality Control',
    '/admin/invoice': 'Invoice',
    '/admin/pembukuan': 'Pembukuan',
    '/admin/fee-tim': 'Fee Tim',
    '/admin/user-management': 'User Management',
    '/admin/role-management': 'Role Management',
    '/admin/master-part': 'Master Part',
  }
  return map[route.path] ?? 'Dashboard'
})

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

async function handleLogout() {
  dropdownOpen.value = false
  logoutLoading.value = true
  try {
    await auth.logout()
  } finally {
    logoutLoading.value = false
    router.push('/login')
  }
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <header class="topbar">
    <div class="topbar-left-wrap">
      <button class="mobile-burger" @click="emit('toggle-sidebar')">
        <Menu :size="20" />
      </button>
      <div class="topbar-breadcrumb">
        <span class="crumb-company">PT Putra Wisanggeni Satu</span>
        <span class="crumb-sep">›</span>
        <span class="crumb-page">{{ pageTitle }}</span>
      </div>
    </div>
    <div class="topbar-right">
      <div class="topbar-user-info">
        <span class="topbar-user-name">{{ auth.userName }}</span>
        <span class="topbar-user-role">{{ auth.userRole }}</span>
      </div>

      <!-- Avatar + Dropdown -->
      <div class="topbar-avatar-wrap" ref="dropdownRef">
        <button
          class="topbar-avatar-btn"
          @click="toggleDropdown"
          :class="{ active: dropdownOpen }"
          :title="auth.userName"
        >
          <div class="topbar-avatar" :style="{ background: auth.userAvatarColor }">
            {{ auth.userInitials }}
          </div>
          <ChevronDown :size="14" class="avatar-chevron" :class="{ rotated: dropdownOpen }" />
        </button>

        <!-- Dropdown Menu -->
        <transition name="dropdown-fade">
          <div v-if="dropdownOpen" class="topbar-dropdown">
            <div class="dropdown-user-info">
              <div class="dropdown-avatar" :style="{ background: auth.userAvatarColor }">
                {{ auth.userInitials }}
              </div>
              <div>
                <p class="dropdown-name">{{ auth.userName }}</p>
                <p class="dropdown-role">{{ auth.userRole }}</p>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-logout-btn" @click="handleLogout" :disabled="logoutLoading">
              <Loader2 v-if="logoutLoading" :size="15" class="spinner" />
              <LogOut v-else :size="15" />
              <span>{{ logoutLoading ? 'Keluar...' : 'Logout' }}</span>
            </button>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar-left-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.mobile-burger {
  display: none;
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}
.mobile-burger:hover {
  background: rgba(255,255,255,0.05);
}

.topbar-user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
}
.topbar-user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.topbar-user-role {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}

/* Avatar Wrap */
.topbar-avatar-wrap {
  position: relative;
}

.topbar-avatar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 10px;
  transition: background 0.2s;
}
.topbar-avatar-btn:hover,
.topbar-avatar-btn.active {
  background: rgba(255, 255, 255, 0.07);
}

.avatar-chevron {
  color: var(--text-muted);
  transition: transform 0.25s ease;
}
.avatar-chevron.rotated {
  transform: rotate(180deg);
}

/* Dropdown */
.topbar-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  background: var(--surface-card, #1e2535);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  padding: 12px;
  z-index: 1000;
}

.dropdown-user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 4px 8px;
}

.dropdown-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dropdown-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #f1f5f9);
  margin: 0;
}

.dropdown-role {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  margin: 0;
}

.dropdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 6px 0;
}

.dropdown-logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #f87171;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  text-align: left;
}
.dropdown-logout-btn:hover {
  background: rgba(248, 113, 113, 0.12);
  color: #fca5a5;
}
.dropdown-logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Spinner */
.spinner { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Transition */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
