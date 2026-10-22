<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminTopbar from '@/components/admin/AdminTopbar.vue'

const route = useRoute()
const isMobileSidebarOpen = ref(false)

const toggleSidebar = () => {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value
}

const closeSidebar = () => {
  isMobileSidebarOpen.value = false
}

watch(() => route.path, () => {
  closeSidebar()
})
</script>

<template>
  <div class="admin-layout" :class="{ 'sidebar-open': isMobileSidebarOpen }">
    <div class="sidebar-overlay" @click="closeSidebar"></div>
    <AdminSidebar />
    <div class="admin-main">
      <AdminTopbar @toggle-sidebar="toggleSidebar" />
      <main class="admin-content">
        <slot />
      </main>
    </div>
  </div>
</template>
