<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useInjectedFirewallOpsConsole } from '~/composables/useFirewallOpsConsole'

const {
  firewallSupplementService,
  lastUpdated,
  dashboardConnected,
  streamPaused,
  totalPendingEscalations,
  dashboardReconnectDelaySeconds,
  dashboardReconnectAttempts,
  dashboardThreatFilter,
  dashboardActionableOnly,
  dashboardQuery,
  dashboardThreatFilterOptions,
  hasActiveDashboardFilters,
  activeDashboardFilterCount,
  reconnectDashboardStream,
  toggleStreamPaused,
  resetDashboardFilters,
  loading,
  refresh,
} = useInjectedFirewallOpsConsole()

const queryInputRef = ref<{ focus?: () => void } | null>(null)

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName
  return target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function handleGlobalFilterShortcut(event: KeyboardEvent): void {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
    return
  }
  if (isEditableTarget(event.target)) {
    return
  }

  event.preventDefault()
  queryInputRef.value?.focus?.()
}

onMounted(() => {
  if (!import.meta.client) {
    return
  }
  window.addEventListener('keydown', handleGlobalFilterShortcut)
})

onBeforeUnmount(() => {
  if (!import.meta.client) {
    return
  }
  window.removeEventListener('keydown', handleGlobalFilterShortcut)
})
</script>

<template>
  <div class="d-flex align-center flex-wrap ga-3 mb-4">
    <div>
      <h1 class="text-h5 font-weight-bold">MCP / Skill / Traffic Supplement</h1>
      <p class="text-body-2 text-medium-emphasis mb-1">
        Agent Firewall endpoint: {{ firewallSupplementService.baseURL }}
      </p>
      <p class="text-body-2 text-medium-emphasis mb-1">
        Dashboard stream: {{ firewallSupplementService.dashboardWsURL }}
      </p>
      <p v-if="lastUpdated" class="text-caption text-medium-emphasis mb-0">
        Last updated: {{ lastUpdated.toLocaleString() }}
      </p>
    </div>

    <v-spacer />

    <v-chip :color="dashboardConnected ? 'green' : 'grey'" variant="tonal" size="small">
      {{ dashboardConnected ? 'Dashboard Connected' : 'Dashboard Disconnected' }}
    </v-chip>

    <v-chip :color="streamPaused ? 'amber' : 'green'" variant="tonal" size="small">
      Capture {{ streamPaused ? 'Paused' : 'Active' }}
    </v-chip>

    <v-chip :color="totalPendingEscalations > 0 ? 'error' : 'green'" variant="tonal" size="small">
      Pending Escalations: {{ totalPendingEscalations }}
    </v-chip>

    <v-chip v-if="hasActiveDashboardFilters" color="primary" variant="tonal" size="small">
      Active Filters: {{ activeDashboardFilterCount }}
    </v-chip>

    <v-chip
      v-if="dashboardReconnectDelaySeconds != null"
      color="amber"
      variant="tonal"
      size="small"
    >
      Reconnect ~{{ dashboardReconnectDelaySeconds }}s (try {{ dashboardReconnectAttempts }})
    </v-chip>

    <v-btn
      variant="text"
      prepend-icon="mdi-wifi-refresh"
      @click="reconnectDashboardStream"
    >
      Reconnect Stream
    </v-btn>

    <v-btn
      variant="text"
      :prepend-icon="streamPaused ? 'mdi-play-circle-outline' : 'mdi-pause-circle-outline'"
      @click="toggleStreamPaused"
    >
      {{ streamPaused ? 'Resume Stream' : 'Pause Stream' }}
    </v-btn>

    <v-btn
      color="primary"
      :loading="loading"
      prepend-icon="mdi-refresh"
      @click="refresh"
    >
      Refresh
    </v-btn>

    <v-text-field
      ref="queryInputRef"
      v-model="dashboardQuery"
      class="mcp-query-field"
      label="Filter request / session / method"
      variant="outlined"
      density="compact"
      hide-details
      clearable
      prepend-inner-icon="mdi-magnify"
      @keydown.esc.stop.prevent="dashboardQuery = ''"
    />

    <v-chip class="mcp-shortcut-chip" variant="outlined" size="small">
      / focus
    </v-chip>

    <v-select
      v-model="dashboardThreatFilter"
      class="mcp-threat-field"
      :items="dashboardThreatFilterOptions"
      label="Threat"
      variant="outlined"
      density="compact"
      hide-details
    />

    <v-switch
      v-model="dashboardActionableOnly"
      color="primary"
      label="Actionable only"
      density="compact"
      hide-details
      class="mcp-actionable-switch"
    />

    <v-btn
      variant="text"
      prepend-icon="mdi-filter-remove-outline"
      :disabled="!hasActiveDashboardFilters"
      @click="resetDashboardFilters"
    >
      Reset Filters
    </v-btn>
  </div>
</template>

<style scoped>
.mcp-query-field {
  min-width: 260px;
  max-width: 360px;
}

.mcp-threat-field {
  min-width: 200px;
  max-width: 260px;
}

.mcp-actionable-switch {
  min-width: 160px;
}

.mcp-shortcut-chip {
  min-width: 72px;
}
</style>
