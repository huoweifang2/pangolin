<script setup lang="ts">
import { useInjectedFirewallOpsConsole } from '~/composables/useFirewallOpsConsole'

const {
  pendingEscalations,
  visiblePendingEscalations,
  visiblePendingEscalationCount,
  totalPendingEscalations,
  escalationSortMode,
  escalationSlaMinutes,
  escalationSortModeOptions,
  visibleEscalationThreatSummary,
  oldestVisibleEscalationAgeLabel,
  staleVisibleEscalationCount,
  hasVisibleEscalationSlaBreach,
  dashboardActionPendingId,
  dashboardBatchActionPending,
  escalationSubtitle,
  setEscalationSortMode,
  setEscalationSlaMinutes,
  resolveEscalation,
  acknowledgeEscalation,
  resolveVisibleEscalations,
  acknowledgeVisibleEscalations,
  resolveVisibleEscalationsByThreat,
  acknowledgeVisibleEscalationsByThreat,
  clearEscalationQueue,
} = useInjectedFirewallOpsConsole()

function onEscalationSortModeChange(value: unknown): void {
  if (value === 'risk' || value === 'newest' || value === 'oldest') {
    setEscalationSortMode(value)
  }
}

function onEscalationSlaMinutesChange(value: unknown): void {
  setEscalationSlaMinutes(value)
}
</script>

<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center flex-wrap ga-2">
      <span>Pending Escalation Queue</span>
      <v-spacer />
      <v-chip color="error" size="small" variant="tonal">
        {{ totalPendingEscalations }} pending
      </v-chip>
      <v-chip color="primary" size="small" variant="tonal">
        Showing {{ visiblePendingEscalationCount }} / {{ totalPendingEscalations }}
      </v-chip>
      <v-chip size="small" variant="tonal">
        Oldest: {{ oldestVisibleEscalationAgeLabel }}
      </v-chip>
      <v-chip :color="hasVisibleEscalationSlaBreach ? 'error' : 'green'" size="small" variant="tonal">
        SLA {{ escalationSlaMinutes }}m: {{ staleVisibleEscalationCount }}
      </v-chip>
      <v-chip
        v-if="visibleEscalationThreatSummary.critical > 0"
        color="error"
        size="small"
        variant="tonal"
      >
        Critical {{ visibleEscalationThreatSummary.critical }}
      </v-chip>
      <v-chip
        v-if="visibleEscalationThreatSummary.high > 0"
        color="warning"
        size="small"
        variant="tonal"
      >
        High {{ visibleEscalationThreatSummary.high }}
      </v-chip>
      <v-text-field
        :model-value="escalationSlaMinutes"
        type="number"
        min="1"
        max="1440"
        density="compact"
        variant="outlined"
        hide-details
        class="queue-sla-field"
        label="SLA (min)"
        @update:model-value="onEscalationSlaMinutesChange"
      />
      <v-select
        :model-value="escalationSortMode"
        :items="escalationSortModeOptions"
        density="compact"
        variant="outlined"
        hide-details
        class="queue-sort-select"
        @update:model-value="onEscalationSortModeChange"
      />
      <v-btn
        variant="text"
        size="small"
        color="success"
        prepend-icon="mdi-check-bold"
        :loading="dashboardBatchActionPending"
        :disabled="visiblePendingEscalationCount === 0"
        @click="resolveVisibleEscalations('allow')"
      >
        Allow Visible
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        color="error"
        prepend-icon="mdi-close-thick"
        :loading="dashboardBatchActionPending"
        :disabled="visiblePendingEscalationCount === 0"
        @click="resolveVisibleEscalations('block')"
      >
        Block Visible
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-check-all"
        :disabled="visiblePendingEscalationCount === 0"
        @click="acknowledgeVisibleEscalations"
      >
        Ack Visible
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        color="error"
        prepend-icon="mdi-shield-alert"
        :loading="dashboardBatchActionPending"
        :disabled="visibleEscalationThreatSummary.critical === 0"
        @click="resolveVisibleEscalationsByThreat('block', ['critical'])"
      >
        Block Critical
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-check-decagram"
        :disabled="visibleEscalationThreatSummary.critical + visibleEscalationThreatSummary.high === 0"
        @click="acknowledgeVisibleEscalationsByThreat(['critical', 'high'])"
      >
        Ack High+
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-broom"
        :disabled="pendingEscalations.length === 0"
        @click="clearEscalationQueue"
      >
        Clear Queue
      </v-btn>
    </v-card-title>
    <v-divider />

    <v-list lines="two" density="compact">
      <v-list-item
        v-for="item in visiblePendingEscalations"
        :key="item.requestId"
        :title="item.requestId"
        :subtitle="escalationSubtitle(item)"
      >
        <template #append>
          <div class="d-flex ga-2">
            <v-btn
              size="x-small"
              color="success"
              variant="tonal"
              :disabled="dashboardBatchActionPending"
              :loading="dashboardActionPendingId === item.requestId"
              @click="resolveEscalation(item, 'allow')"
            >
              Allow
            </v-btn>
            <v-btn
              size="x-small"
              color="error"
              variant="tonal"
              :disabled="dashboardBatchActionPending"
              :loading="dashboardActionPendingId === item.requestId"
              @click="resolveEscalation(item, 'block')"
            >
              Block
            </v-btn>
            <v-btn
              size="x-small"
              color="grey"
              variant="tonal"
              :disabled="dashboardBatchActionPending"
              @click="acknowledgeEscalation(item)"
            >
              Ack
            </v-btn>
          </div>
        </template>
      </v-list-item>
    </v-list>

    <v-alert
      v-if="visiblePendingEscalations.length === 0"
      :type="pendingEscalations.length === 0 ? 'success' : 'info'"
      variant="tonal"
      class="ma-4"
    >
      {{ pendingEscalations.length === 0
        ? 'No pending escalations.'
        : 'No pending escalations match the active filters.' }}
    </v-alert>
  </v-card>
</template>

<style scoped>
.queue-sort-select {
  min-width: 170px;
  max-width: 220px;
}

.queue-sla-field {
  min-width: 120px;
  max-width: 140px;
}
</style>
