<template>
  <v-app>
    <v-app-bar density="compact" elevation="0" class="app-bar--shadow">
      <v-app-bar-nav-icon
        @click="drawer = !drawer"
      />
      <v-app-bar-title></v-app-bar-title>

      <template #append>
        <health-indicator />
        <v-btn
          :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="text"
          @click="toggle"
        />
      </template>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" width="280">
      <nuxt-link to="/playground" class="sidebar-logo-item d-block text-decoration-none">
        <img src="/pangolin.svg" alt="Pangolin" class="sidebar-logo" />
        <div class="text-caption text-secondary mt-1">Pangolin Security Gateway</div>
      </nuxt-link>
      <v-divider color="primary" thickness="2" />
      <app-nav-drawer />
    </v-navigation-drawer>

    <v-main>
      <slot />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppTheme } from '~/composables/useAppTheme'
import { useAppMode } from '~/composables/useAppMode'

const drawer = ref(true)
const { isDark, toggle } = useAppTheme()
const { fetchMode } = useAppMode()

onMounted(() => {
  fetchMode()
})
</script>

<style lang="scss" scoped>
/* Legacy Agent Firewall style token bridge for migrated pages */
:global(:root) {
  --bg-primary: rgb(17, 24, 39);
  --bg-secondary: rgb(31, 41, 55);
  --bg-surface: rgb(30, 41, 59);
  --bg-hover: rgba(148, 163, 184, 0.12);
  --bg-active: rgba(59, 130, 246, 0.18);
  --bg-elevated: rgb(51, 65, 85);

  --text-primary: rgb(248, 250, 252);
  --text-secondary: rgb(203, 213, 225);
  --text-muted: rgb(148, 163, 184);
  --text-dim: rgb(100, 116, 139);

  --border: rgba(148, 163, 184, 0.25);
  --border-hover: rgba(148, 163, 184, 0.4);

  --accent: rgb(59, 130, 246);
  --accent-red: rgb(239, 68, 68);
  --accent-green: rgb(34, 197, 94);
  --accent-yellow: rgb(245, 158, 11);
}

// Ensure main content fills viewport
.v-main {
  min-height: 100vh;
}

.sidebar-logo-item {
  padding: 16px 16px 8px !important;
  text-align: center;
}

.sidebar-logo {
  width: 100%;
  max-width: 140px;
  height: auto;
  object-fit: contain;
}

.app-bar--shadow {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08) !important;
}
</style>
