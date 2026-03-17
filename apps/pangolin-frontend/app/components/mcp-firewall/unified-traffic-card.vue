<script setup lang="ts">
import { useInjectedFirewallOpsConsole } from '~/composables/useFirewallOpsConsole'

const {
  recentUnifiedTrafficEntries,
  visibleUnifiedTrafficCount,
  hasUnifiedTrafficFilters,
  unifiedTrafficQuery,
  unifiedTrafficSourceFilter,
  unifiedTrafficKindFilter,
  unifiedTrafficAlertsOnly,
  unifiedTrafficSourceOptions,
  unifiedTrafficKindOptions,
  formatTimestamp,
  verdictColor,
  threatColor,
  unifiedTrafficSourceLabel,
  unifiedTrafficSourceColor,
  unifiedTrafficKindLabel,
  unifiedTrafficKindColor,
  clearUnifiedTrafficFilters,
} = useInjectedFirewallOpsConsole()
</script>

<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center flex-wrap ga-2">
      <span>Unified Traffic Feed</span>
      <v-spacer />
      <v-chip size="small" variant="tonal">Showing {{ recentUnifiedTrafficEntries.length }} / {{ visibleUnifiedTrafficCount }}</v-chip>
      <v-chip v-if="unifiedTrafficAlertsOnly" color="warning" size="small" variant="tonal">Alerts only</v-chip>
    </v-card-title>

    <v-divider />

    <div class="pa-4 d-flex flex-wrap ga-3">
      <v-text-field
        v-model="unifiedTrafficQuery"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        label="Search method / session / verdict"
        class="unified-query-field"
      />

      <v-select
        v-model="unifiedTrafficSourceFilter"
        :items="unifiedTrafficSourceOptions"
        density="compact"
        variant="outlined"
        hide-details
        label="Source"
        class="unified-source-field"
      />

      <v-select
        v-model="unifiedTrafficKindFilter"
        :items="unifiedTrafficKindOptions"
        density="compact"
        variant="outlined"
        hide-details
        label="Protocol"
        class="unified-kind-field"
      />

      <v-switch
        v-model="unifiedTrafficAlertsOnly"
        density="compact"
        hide-details
        color="warning"
        label="Alerts only"
      />

      <v-btn
        variant="text"
        prepend-icon="mdi-filter-remove-outline"
        :disabled="!hasUnifiedTrafficFilters"
        @click="clearUnifiedTrafficFilters"
      >
        Reset
      </v-btn>
    </div>

    <v-divider />

    <v-table density="comfortable">
      <thead>
        <tr>
          <th>Time</th>
          <th>Source</th>
          <th>Protocol</th>
          <th>Method</th>
          <th>Request</th>
          <th>Verdict</th>
          <th>Threat</th>
          <th>Session</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in recentUnifiedTrafficEntries" :key="entry.id">
          <td class="text-caption">{{ formatTimestamp(entry.rawTimestamp ?? entry.timestamp) }}</td>
          <td>
            <v-chip :color="unifiedTrafficSourceColor(entry.source)" size="x-small" variant="tonal">
              {{ unifiedTrafficSourceLabel(entry.source) }}
            </v-chip>
          </td>
          <td>
            <v-chip :color="unifiedTrafficKindColor(entry.kind)" size="x-small" variant="tonal">
              {{ unifiedTrafficKindLabel(entry.kind) }}
            </v-chip>
          </td>
          <td class="mono text-caption">{{ entry.method }}</td>
          <td class="mono text-caption">{{ entry.requestId ?? 'n/a' }}</td>
          <td>
            <v-chip :color="verdictColor(entry.verdict)" size="x-small" variant="tonal">
              {{ entry.verdict }}
            </v-chip>
          </td>
          <td>
            <v-chip :color="threatColor(entry.threatLevel)" size="x-small" variant="tonal">
              {{ entry.threatLevel }}
            </v-chip>
          </td>
          <td class="mono text-caption">{{ entry.sessionId }}</td>
        </tr>
      </tbody>
    </v-table>

    <v-alert
      v-if="recentUnifiedTrafficEntries.length === 0"
      type="info"
      variant="tonal"
      class="ma-4"
    >
      {{ hasUnifiedTrafficFilters
        ? 'No unified traffic entries match current filters.'
        : 'No unified traffic entries yet.' }}
    </v-alert>
  </v-card>
</template>

<style scoped>
.unified-query-field {
  min-width: 260px;
  max-width: 380px;
}

.unified-source-field {
  min-width: 180px;
  max-width: 220px;
}

.unified-kind-field {
  min-width: 180px;
  max-width: 220px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
</style>
