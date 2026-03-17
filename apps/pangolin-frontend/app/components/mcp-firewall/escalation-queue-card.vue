<script setup lang="ts">
import { useInjectedFirewallOpsConsole } from '~/composables/useFirewallOpsConsole'

const {
  pendingEscalations,
  visiblePendingEscalations,
  visiblePendingEscalationCount,
  totalPendingEscalations,
  escalationSortMode,
  escalationSortModeOptions,
  visibleEscalationThreatSummary,
  oldestVisibleEscalationAgeLabel,
  dashboardActionPendingId,
  dashboardBatchActionPending,
  escalationSubtitle,
  setEscalationSortMode,
  resolveEscalation,
  acknowledgeEscalation,
  resolveVisibleEscalations,
  acknowledgeVisibleEscalations,
  clearEscalationQueue,
} = useInjectedFirewallOpsConsole()

function onEscalationSortModeChange(value: unknown): void {
  if (value === 'risk' || value === 'newest' || value === 'oldest') {
    setEscalationSortMode(value)
  }
}
</script>

<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center">
      <span>Pending Escalation Queue</span>
      <v-spacer />
      <v-chip color="error" size="small" variant="tonal" class="mr-2">
        {{ totalPendingEscalations }} pending
      </v-chip>
      <v-chip color="primary" size="small" variant="tonal" class="mr-2">
        Showing {{ visiblePendingEscalationCount }} / {{ totalPendingEscalations }}
      </v-chip>
      <v-chip size="small" variant="tonal" class="mr-2">
        Oldest: {{ oldestVisibleEscalationAgeLabel }}
      </v-chip>
      <v-chip
        v-if="visibleEscalationThreatSummary.critical > 0"
        color="error"
        size="small"
        variant="tonal"
        class="mr-2"
      >
        Critical {{ visibleEscalationThreatSummary.critical }}
      </v-chip>
      <v-chip
        v-if="visibleEscalationThreatSummary.high > 0"
        color="warning"
        size="small"
        variant="tonal"
        class="mr-2"
      >
        High {{ visibleEscalationThreatSummary.high }}
      </v-chip>
      <v-select
        :model-value="escalationSortMode"
        :items="escalationSortModeOptions"
        density="compact"
        variant="outlined"
        hide-details
        class="queue-sort-select mr-2"
        @update:model-value="onEscalationSortModeChange"
      />
      <v-btn
        variant="text"
        size="small"
        color="success"
        prepend-icon="mdi-check-bold"
        class="mr-2"
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
        class="mr-2"
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
        class="mr-2"
        :disabled="visiblePendingEscalationCount === 0"
        @click="acknowledgeVisibleEscalations"
      >
        Ack Visible
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
</style>
