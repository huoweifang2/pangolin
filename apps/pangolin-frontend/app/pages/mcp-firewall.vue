<script setup lang="ts">
import { useFirewallOpsConsole } from '../composables/useFirewallOpsConsole'

definePageMeta({ title: 'MCP Firewall' })

const {
  firewallSupplementService,
  loading,
  errorMessage,
  operationError,
  operationMessage,
  lastUpdated,
  auditEntries,
  traces,
  datasets,
  skills,
  mcpServers,
  dashboardConnected,
  dashboardError,
  dashboardActionPendingId,
  dashboardReconnectAttempts,
  dashboardReconnectDelaySeconds,
  streamPaused,
  dashboardViewMode,
  newSkill,
  newServer,
  transportOptions,
  totalAudit,
  totalTraces,
  totalDatasets,
  totalSkills,
  totalServers,
  dashboardEventCount,
  recentDashboardEvents,
  pendingEscalations,
  totalPendingEscalations,
  recentActionHistory,
  canAddSkill,
  canAddServer,
  verdictColor,
  threatColor,
  formatTimestamp,
  traceIdentifier,
  traceCreatedAt,
  skillLabel,
  serverLabel,
  dashboardVerdict,
  dashboardThreat,
  dashboardMethod,
  dashboardRequestId,
  canResolveEvent,
  actionLabel,
  actionColor,
  toggleStreamPaused,
  setDashboardViewMode,
  reconnectDashboardStream,
  clearEscalationQueue,
  escalationSubtitle,
  resolveEscalation,
  acknowledgeEscalation,
  onHumanAction,
  refresh,
  addSkill,
  removeSkill,
  addMcpServer,
  removeMcpServer,
  savingSkill,
  deletingSkillId,
  savingServer,
  deletingServerId,
} = useFirewallOpsConsole()
</script>
<template>
  <v-container fluid>
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
    </div>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      border="start"
      class="mb-4"
    >
      {{ errorMessage }}
    </v-alert>

    <v-alert
      v-if="dashboardError"
      type="warning"
      variant="tonal"
      border="start"
      class="mb-4"
    >
      {{ dashboardError }}
    </v-alert>

    <v-alert
      v-if="operationError"
      type="error"
      variant="tonal"
      border="start"
      class="mb-4"
    >
      {{ operationError }}
    </v-alert>

    <v-alert
      v-if="operationMessage"
      type="success"
      variant="tonal"
      border="start"
      class="mb-4"
    >
      {{ operationMessage }}
    </v-alert>

    <v-row class="mb-1">
      <v-col cols="12" sm="6" md="4" lg="2">
        <v-card variant="tonal" color="primary">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Traffic Entries</div>
            <div class="text-h4 font-weight-bold">{{ totalAudit }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="2">
        <v-card variant="tonal" color="secondary">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">MCP Traces</div>
            <div class="text-h4 font-weight-bold">{{ totalTraces }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="2">
        <v-card variant="tonal" color="info">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Datasets</div>
            <div class="text-h4 font-weight-bold">{{ totalDatasets }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="2">
        <v-card variant="tonal" color="success">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Skills</div>
            <div class="text-h4 font-weight-bold">{{ totalSkills }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="2">
        <v-card variant="tonal" color="warning">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">MCP Servers</div>
            <div class="text-h4 font-weight-bold">{{ totalServers }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="2">
        <v-card variant="tonal" color="deep-purple">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Live Events</div>
            <div class="text-h4 font-weight-bold">{{ dashboardEventCount }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4" lg="2">
        <v-card variant="tonal" color="error">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Escalation Queue</div>
            <div class="text-h4 font-weight-bold">{{ totalPendingEscalations }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

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

    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <span>Dashboard Live Stream</span>
        <v-spacer />
        <div class="d-flex ga-2 mr-3">
          <v-btn
            size="x-small"
            :variant="dashboardViewMode === 'all' ? 'flat' : 'tonal'"
            color="primary"
            @click="setDashboardViewMode('all')"
          >
            All
          </v-btn>
          <v-btn
            size="x-small"
            :variant="dashboardViewMode === 'alert' ? 'flat' : 'tonal'"
            color="warning"
            @click="setDashboardViewMode('alert')"
          >
            Alert
          </v-btn>
          <v-btn
            size="x-small"
            :variant="dashboardViewMode === 'escalate' ? 'flat' : 'tonal'"
            color="error"
            @click="setDashboardViewMode('escalate')"
          >
            Escalate
          </v-btn>
        </div>
        <v-chip :color="dashboardConnected ? 'green' : 'grey'" size="small" variant="tonal">
          {{ dashboardConnected ? 'Online' : 'Offline' }}
        </v-chip>
      </v-card-title>
      <v-divider />

      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Time</th>
            <th>Event</th>
            <th>Request</th>
            <th>Verdict</th>
            <th>Threat</th>
            <th>Session</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(event, index) in recentDashboardEvents" :key="`${event.timestamp ?? index}-${index}`">
            <td class="text-caption">{{ formatTimestamp(event.timestamp) }}</td>
            <td class="mono text-caption">{{ dashboardMethod(event) }}</td>
            <td class="mono text-caption">{{ dashboardRequestId(event) ?? 'n/a' }}</td>
            <td>
              <v-chip :color="verdictColor(dashboardVerdict(event))" size="small" variant="tonal">
                {{ dashboardVerdict(event) }}
              </v-chip>
            </td>
            <td>
              <v-chip :color="threatColor(dashboardThreat(event))" size="small" variant="tonal">
                {{ dashboardThreat(event) }}
              </v-chip>
            </td>
            <td class="mono text-caption">{{ event.session_id ?? 'n/a' }}</td>
            <td>
              <div v-if="canResolveEvent(event)" class="d-flex ga-2">
                <v-btn
                  size="x-small"
                  color="success"
                  variant="tonal"
                  :loading="dashboardActionPendingId === dashboardRequestId(event)"
                  @click="onHumanAction(event, 'allow')"
                >
                  Allow
                </v-btn>
                <v-btn
                  size="x-small"
                  color="error"
                  variant="tonal"
                  :loading="dashboardActionPendingId === dashboardRequestId(event)"
                  @click="onHumanAction(event, 'block')"
                >
                  Block
                </v-btn>
              </div>
              <span v-else class="text-caption text-medium-emphasis">-</span>
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-alert
        v-if="recentDashboardEvents.length === 0"
        type="info"
        variant="tonal"
        class="ma-4"
      >
        Waiting for dashboard events. Generate traffic to see live stream updates.
      </v-alert>
    </v-card>

    <v-row>
      <v-col cols="12" xl="8">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>Traffic Audit</span>
            <v-spacer />
            <v-chip size="small" variant="tonal">Recent {{ totalAudit }}</v-chip>
          </v-card-title>

          <v-divider />

          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Time</th>
                <th>Verdict</th>
                <th>Threat</th>
                <th>Method</th>
                <th>Session</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in auditEntries" :key="`${entry.id}-${entry.timestamp}`">
                <td class="text-caption">{{ formatTimestamp(entry.timestamp) }}</td>
                <td>
                  <v-chip :color="verdictColor(entry.verdict)" size="small" variant="tonal">
                    {{ entry.verdict }}
                  </v-chip>
                </td>
                <td>
                  <v-chip :color="threatColor(entry.threat_level)" size="small" variant="tonal">
                    {{ entry.threat_level }}
                  </v-chip>
                </td>
                <td class="mono text-caption">{{ entry.method || 'n/a' }}</td>
                <td class="mono text-caption">{{ entry.session_id || 'n/a' }}</td>
              </tr>
            </tbody>
          </v-table>

          <v-alert
            v-if="!loading && totalAudit === 0"
            type="info"
            variant="tonal"
            class="ma-4"
          >
            No traffic entries yet.
          </v-alert>
        </v-card>
      </v-col>

      <v-col cols="12" xl="4">
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <span>MCP Trace Stream</span>
            <v-spacer />
            <v-chip size="small" variant="tonal">{{ totalTraces }}</v-chip>
          </v-card-title>
          <v-divider />

          <v-list lines="two" density="compact">
            <v-list-item
              v-for="trace in traces.slice(0, 12)"
              :key="traceIdentifier(trace)"
              :title="traceIdentifier(trace)"
              :subtitle="traceCreatedAt(trace)"
            >
              <template #append>
                <v-chip
                  :color="verdictColor(trace.analysis?.verdict)"
                  size="x-small"
                  variant="tonal"
                >
                  {{ trace.analysis?.verdict ?? 'UNKNOWN' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <v-alert
            v-if="!loading && totalTraces === 0"
            type="info"
            variant="tonal"
            class="ma-4"
          >
            No traces found.
          </v-alert>
        </v-card>

        <v-card>
          <v-card-title class="d-flex align-center">
            <span>Datasets</span>
            <v-spacer />
            <v-chip size="small" variant="tonal">{{ totalDatasets }}</v-chip>
          </v-card-title>
          <v-divider />

          <v-list lines="two" density="compact">
            <v-list-item
              v-for="dataset in datasets"
              :key="dataset.id ?? dataset.name ?? 'dataset'"
              :title="dataset.name ?? 'Unnamed dataset'"
              :subtitle="dataset.description || 'No description'"
            >
              <template #append>
                <v-chip size="x-small" variant="tonal" :color="dataset.is_public ? 'green' : 'blue'">
                  {{ dataset.is_public ? 'Public' : 'Private' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <v-alert
            v-if="!loading && totalDatasets === 0"
            type="info"
            variant="tonal"
            class="ma-4"
          >
            No datasets available.
          </v-alert>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>Custom Skills</span>
            <v-spacer />
            <v-chip size="small" variant="tonal">{{ totalSkills }}</v-chip>
          </v-card-title>
          <v-divider />

          <div class="pa-4">
            <v-row dense>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="newSkill.id"
                  label="Skill ID"
                  density="comfortable"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="newSkill.name"
                  label="Name (optional)"
                  density="comfortable"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="newSkill.description"
                  label="Description (optional)"
                  density="comfortable"
                  hide-details
                />
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-3">
              <v-btn
                color="success"
                prepend-icon="mdi-plus"
                :disabled="!canAddSkill"
                :loading="savingSkill"
                @click="addSkill"
              >
                Save Skill
              </v-btn>
            </div>
          </div>

          <v-divider />

          <v-list lines="two" density="compact">
            <v-list-item
              v-for="skill in skills"
              :key="skill.id"
              :title="skillLabel(skill)"
              :subtitle="skill.description ?? skill.id"
            >
              <template #append>
                <v-btn
                  variant="text"
                  color="error"
                  icon="mdi-delete-outline"
                  :loading="deletingSkillId === skill.id"
                  @click="removeSkill(skill.id)"
                />
              </template>
            </v-list-item>
          </v-list>

          <v-alert
            v-if="!loading && totalSkills === 0"
            type="info"
            variant="tonal"
            class="ma-4"
          >
            No custom skills configured.
          </v-alert>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>Custom MCP Servers</span>
            <v-spacer />
            <v-chip size="small" variant="tonal">{{ totalServers }}</v-chip>
          </v-card-title>
          <v-divider />

          <div class="pa-4">
            <v-row dense>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="newServer.id"
                  label="Server ID"
                  density="comfortable"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="newServer.name"
                  label="Name (optional)"
                  density="comfortable"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="newServer.transport"
                  :items="transportOptions"
                  label="Transport"
                  density="comfortable"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="newServer.url"
                  label="URL / command (optional)"
                  density="comfortable"
                  hide-details
                />
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-3">
              <v-btn
                color="warning"
                prepend-icon="mdi-plus"
                :disabled="!canAddServer"
                :loading="savingServer"
                @click="addMcpServer"
              >
                Save MCP Server
              </v-btn>
            </div>
          </div>

          <v-divider />

          <v-list lines="two" density="compact">
            <v-list-item
              v-for="server in mcpServers"
              :key="server.id"
              :title="serverLabel(server)"
              :subtitle="server.url ?? 'No URL configured'"
            >
              <template #append>
                <v-chip size="x-small" variant="tonal" color="warning" class="mr-2">
                  {{ server.transport ?? 'unknown' }}
                </v-chip>
                <v-btn
                  variant="text"
                  color="error"
                  icon="mdi-delete-outline"
                  :loading="deletingServerId === server.id"
                  @click="removeMcpServer(server.id)"
                />
              </template>
            </v-list-item>
          </v-list>

          <v-alert
            v-if="!loading && totalServers === 0"
            type="info"
            variant="tonal"
            class="ma-4"
          >
            No custom MCP servers configured.
          </v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
</style>
