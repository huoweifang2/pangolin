<script setup lang="ts">
import { useInjectedFirewallOpsConsole } from '~/composables/useFirewallOpsConsole'

const {
  recentActionHistory,
  formatTimestamp,
  actionColor,
  actionLabel,
} = useInjectedFirewallOpsConsole()
</script>

<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center">
      <span>Action History</span>
      <v-spacer />
      <v-chip size="small" variant="tonal">{{ recentActionHistory.length }}</v-chip>
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
      v-if="recentActionHistory.length === 0"
      type="info"
      variant="tonal"
      class="ma-4"
    >
      No actions yet.
    </v-alert>
  </v-card>
</template>
