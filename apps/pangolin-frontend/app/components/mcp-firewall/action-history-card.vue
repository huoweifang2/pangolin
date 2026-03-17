<script setup lang="ts">
import { useInjectedFirewallOpsConsole } from '~/composables/useFirewallOpsConsole'

const {
  actionHistoryCount,
  canUndoAction,
  recentActionHistory,
  formatTimestamp,
  actionColor,
  actionLabel,
  undoLastAction,
  clearActionHistory,
} = useInjectedFirewallOpsConsole()
</script>

<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center">
      <span>Action History</span>
      <v-spacer />
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-undo-variant"
        :disabled="!canUndoAction"
        @click="undoLastAction"
      >
        Undo Last
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        color="error"
        prepend-icon="mdi-trash-can-outline"
        :disabled="actionHistoryCount === 0"
        @click="clearActionHistory"
      >
        Clear
      </v-btn>
      <v-chip size="small" variant="tonal">{{ actionHistoryCount }}</v-chip>
    </v-card-title>
    <v-divider />

    <v-list lines="two" density="compact">
      <v-list-item
        v-for="record in recentActionHistory"
        :key="`${record.requestId}-${record.timestamp}-${record.action}`"
        :title="record.requestId"
        :subtitle="formatTimestamp(record.timestamp)"
      >
        <template #append>
          <v-chip :color="actionColor(record.action)" size="x-small" variant="tonal">
            {{ actionLabel(record.action) }}
          </v-chip>
        </template>
      </v-list-item>
    </v-list>

    <v-alert
      v-if="actionHistoryCount === 0"
      type="info"
      variant="tonal"
      class="ma-4"
    >
      No actions yet.
    </v-alert>
  </v-card>
</template>
