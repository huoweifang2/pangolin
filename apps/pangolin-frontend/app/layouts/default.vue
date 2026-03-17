<template>
  <v-app>
    <v-app-bar density="compact" elevation="0" class="app-bar--shadow">
      <v-app-bar-nav-icon
        @click="drawer = !drawer"
      />
      <v-app-bar-title>
        <div class="app-bar-brand">
          <img src="/pangolin.svg" alt="Pangolin" class="app-bar-brand-icon" />
          <span class="app-bar-brand-title">Pangolin</span>
        </div>
      </v-app-bar-title>

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
        <div class="sidebar-logo-shell">
          <img src="/pangolin.svg" alt="Pangolin" class="sidebar-logo" />
        </div>
        <div class="sidebar-title mt-2">Pangolin</div>
        <div class="text-caption text-secondary mt-1">Threat-Aware Agent Console</div>
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
// Ensure main content fills viewport
.v-main {
  min-height: 100vh;
}

.sidebar-logo-item {
  padding: 16px 16px 8px !important;
  text-align: center;
}

.sidebar-logo-shell {
  margin: 0 auto;
  width: 148px;
  border-radius: 16px;
  padding: 10px;
  border: 1px solid rgba(var(--v-theme-primary), 0.24);
  background: linear-gradient(
    145deg,
    rgba(var(--v-theme-primary), 0.2),
    rgba(var(--v-theme-secondary), 0.18)
  );
}

.sidebar-logo {
  width: 100%;
  max-width: 120px;
  height: auto;
  object-fit: contain;
}

.sidebar-title {
  font-family: 'Space Grotesk', 'IBM Plex Sans', 'Noto Sans SC', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgb(var(--v-theme-primary));
  text-transform: uppercase;
}

.app-bar-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.app-bar-brand-icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.app-bar-brand-title {
  font-family: 'Space Grotesk', 'IBM Plex Sans', 'Noto Sans SC', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}

.app-bar--shadow {
  box-shadow: 0 6px 20px rgba(8, 20, 19, 0.18) !important;
}
</style>
