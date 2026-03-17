<script setup lang="ts">
import { useInjectedFirewallOpsConsole } from '~/composables/useFirewallOpsConsole'

const {
  pendingEscalations,
  totalPendingEscalations,
  dashboardActionPendingId,
  escalationSubtitle,
  resolveEscalation,
  acknowledgeEscalation,
  clearEscalationQueue,
} = useInjectedFirewallOpsConsole()
</script>

<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center">
      <span>Pending Escalation Queue</span>
      <v-spacer />
      <v-chip color="error" size="small" variant="tonal" class="mr-2">
        {{ totalPendingEscalations }} pending
      </v-chip>
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-broom"
        @click="clearEscalationQueue"
      >
        Clear Queue
      </v-btn>
    </v-card-title>
    <v-divider />

    <v-list lines="two" density="compact">
      <v-list-item
        v-for="item in pendingEscalations"
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
              :loading="dashboardActionPendingId === item.requestId"
              @click="resolveEscalation(item, 'allow')"
            >
              Allow
            </v-btn>
            <v-btn
              size="x-small"
              color="error"
              variant="tonal"
              :loading="dashboardActionPendingId === item.requestId"
              @click="resolveEscalation(item, 'block')"
            >
              Block
            </v-btn>
            <v-btn
              size="x-small"
              color="grey"
              variant="tonal"
              @click="acknowledgeEscalation(item)"
            >
              Ack
            </v-btn>
          </div>
        </template>
      </v-list-item>
    </v-list>

    <v-alert
      v-if="pendingEscalations.length === 0"
      type="success"
      variant="tonal"
      class="ma-4"
    >
      No pending escalations.
    </v-alert>
  </v-card>
</template>
