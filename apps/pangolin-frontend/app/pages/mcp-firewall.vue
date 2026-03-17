<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { firewallSupplementService, toErrorMessage } from '../services/firewallSupplementService'
import type {
  FirewallAuditEntry,
  FirewallDashboardEvent,
  FirewallDataset,
  FirewallMcpServer,
  FirewallMcpServerInput,
  FirewallSkill,
  FirewallSkillInput,
  FirewallTrace,
} from '../types/firewallSupplement'

definePageMeta({ title: 'MCP Firewall' })

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const operationError = ref<string | null>(null)
const operationMessage = ref<string | null>(null)
const lastUpdated = ref<Date | null>(null)

const auditEntries = ref<FirewallAuditEntry[]>([])
const traces = ref<FirewallTrace[]>([])
const datasets = ref<FirewallDataset[]>([])
const skills = ref<FirewallSkill[]>([])
const mcpServers = ref<FirewallMcpServer[]>([])

const dashboardConnected = ref(false)
const dashboardError = ref<string | null>(null)
const dashboardEvents = ref<FirewallDashboardEvent[]>([])
let dashboardSocket: WebSocket | null = null
const dashboardActionPendingId = ref<string | null>(null)
const handledRequestIds = ref<string[]>([])
const dashboardReconnectAttempts = ref(0)
const dashboardReconnectDelaySeconds = ref<number | null>(null)
const keepDashboardReconnect = ref(true)
let dashboardReconnectTimer: ReturnType<typeof setTimeout> | null = null

interface EscalationItem {
  requestId: string
  event: FirewallDashboardEvent
  verdict: string
}

const savingSkill = ref(false)
const deletingSkillId = ref<string | null>(null)
const savingServer = ref(false)
const deletingServerId = ref<string | null>(null)

const newSkill = ref<FirewallSkillInput>({ id: '', name: '', description: '' })
const newServer = ref<FirewallMcpServerInput>({ id: '', name: '', transport: 'sse', url: '' })
const transportOptions = ['sse', 'stdio', 'http', 'websocket']

const totalAudit = computed(() => auditEntries.value.length)
const totalTraces = computed(() => traces.value.length)
const totalDatasets = computed(() => datasets.value.length)
const totalSkills = computed(() => skills.value.length)
const totalServers = computed(() => mcpServers.value.length)
const dashboardEventCount = computed(() => dashboardEvents.value.length)
const recentDashboardEvents = computed(() => dashboardEvents.value.slice(0, 12))
const escalationItems = computed<EscalationItem[]>(() => {
  const latestByRequest = new Map<string, EscalationItem>()
  for (const event of dashboardEvents.value) {
    const requestId = dashboardRequestId(event)
    if (!requestId || latestByRequest.has(requestId)) {
      continue
    }
    latestByRequest.set(requestId, {
      requestId,
      event,
      verdict: dashboardVerdict(event),
    })
  }
  return Array.from(latestByRequest.values())
})
const pendingEscalations = computed(() =>
  escalationItems.value.filter(
    (item) => item.verdict === 'ESCALATE' && !handledRequestIds.value.includes(item.requestId),
  ),
)
const totalPendingEscalations = computed(() => pendingEscalations.value.length)

const canAddSkill = computed(() => newSkill.value.id.trim().length > 0)
const canAddServer = computed(() => newServer.value.id.trim().length > 0)

function verdictColor(verdict?: string): string {
  switch ((verdict ?? '').toUpperCase()) {
    case 'BLOCK':
      return 'red'
    case 'ESCALATE':
      return 'orange'
    case 'ALLOW':
      return 'green'
    default:
      return 'grey'
  }
}

function threatColor(level?: string): string {
  switch ((level ?? '').toUpperCase()) {
    case 'CRITICAL':
      return 'red-darken-2'
    case 'HIGH':
      return 'red'
    case 'MEDIUM':
      return 'orange'
    case 'LOW':
      return 'blue'
    default:
      return 'grey'
  }
}

function formatTimestamp(timestamp?: number | string): string {
  if (timestamp == null) return 'n/a'

  const value = typeof timestamp === 'number' ? timestamp * 1000 : Date.parse(timestamp)
  if (Number.isNaN(value)) return String(timestamp)

  return new Date(value).toLocaleString()
}

function traceIdentifier(trace: FirewallTrace): string {
  return trace.id ?? trace.trace_id ?? trace.session_id ?? 'unknown'
}

function traceCreatedAt(trace: FirewallTrace): string {
  return formatTimestamp(trace.created_at)
}

function skillLabel(skill: FirewallSkill): string {
  return skill.name ?? skill.id
}

function serverLabel(server: FirewallMcpServer): string {
  return server.name ?? server.id
}

function dashboardVerdict(event: FirewallDashboardEvent): string {
  return String(event.analysis?.verdict ?? event.verdict ?? 'UNKNOWN').toUpperCase()
}

function dashboardThreat(event: FirewallDashboardEvent): string {
  return String(event.analysis?.threat_level ?? 'NONE').toUpperCase()
}

function dashboardMethod(event: FirewallDashboardEvent): string {
  return event.method ?? event.event_type ?? 'event'
}

function dashboardRequestId(event: FirewallDashboardEvent): string | null {
  const requestId = cleanText(event.analysis?.request_id)
  return requestId ?? null
}

function canResolveEvent(event: FirewallDashboardEvent): boolean {
  return dashboardVerdict(event) === 'ESCALATE' && dashboardRequestId(event) != null
}

function clearOperationFeedback(): void {
  operationError.value = null
  operationMessage.value = null
}

function clearDashboardReconnectTimer(): void {
  if (dashboardReconnectTimer) {
    clearTimeout(dashboardReconnectTimer)
    dashboardReconnectTimer = null
  }
  dashboardReconnectDelaySeconds.value = null
}

function scheduleDashboardReconnect(): void {
  if (!keepDashboardReconnect.value) {
    return
  }

  clearDashboardReconnectTimer()
  dashboardReconnectAttempts.value += 1
  const delayMs = Math.min(1000 * 2 ** Math.min(dashboardReconnectAttempts.value, 4), 15000)
  dashboardReconnectDelaySeconds.value = Math.ceil(delayMs / 1000)

  dashboardReconnectTimer = setTimeout(() => {
    dashboardReconnectTimer = null
    dashboardReconnectDelaySeconds.value = null
    openDashboardStream()
  }, delayMs)
}

function cleanText(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function pushDashboardEvent(event: FirewallDashboardEvent): void {
  dashboardEvents.value = [event, ...dashboardEvents.value].slice(0, 50)
}

function closeDashboardStream(): void {
  clearDashboardReconnectTimer()
  if (dashboardSocket) {
    dashboardSocket.close()
    dashboardSocket = null
  }
  dashboardConnected.value = false
}

function openDashboardStream(): void {
  if (!import.meta.client) {
    return
  }

  closeDashboardStream()
  dashboardError.value = null

  const socket = new WebSocket(firewallSupplementService.dashboardWsURL)
  dashboardSocket = socket

  socket.onopen = () => {
    clearDashboardReconnectTimer()
    dashboardReconnectAttempts.value = 0
    dashboardConnected.value = true
    dashboardError.value = null
  }

  socket.onclose = () => {
    if (dashboardSocket !== socket) {
      return
    }
    dashboardSocket = null
    dashboardConnected.value = false
    scheduleDashboardReconnect()
  }

  socket.onerror = () => {
    dashboardError.value = 'Dashboard WebSocket connection error'
  }

  socket.onmessage = (message) => {
    try {
      const parsed = JSON.parse(String(message.data)) as FirewallDashboardEvent
      pushDashboardEvent(parsed)
    } catch {
      // Ignore malformed events from mixed environments.
    }
  }
}

function reconnectDashboardStream(): void {
  keepDashboardReconnect.value = true
  dashboardReconnectAttempts.value = 0
  openDashboardStream()
}

function markEscalationHandled(requestId: string): void {
  if (!handledRequestIds.value.includes(requestId)) {
    handledRequestIds.value = [requestId, ...handledRequestIds.value].slice(0, 200)
  }
}

function clearEscalationQueue(): void {
  const queueIds = pendingEscalations.value.map((item) => item.requestId)
  handledRequestIds.value = Array.from(new Set([...queueIds, ...handledRequestIds.value])).slice(0, 200)
}

function escalationSubtitle(item: EscalationItem): string {
  return `${dashboardMethod(item.event)} · ${dashboardThreat(item.event)} · ${formatTimestamp(item.event.timestamp)}`
}

function resolveEscalation(item: EscalationItem, action: 'allow' | 'block'): void {
  void sendDashboardAction(action, item.requestId)
}

async function sendDashboardAction(action: 'allow' | 'block', requestId: string): Promise<void> {
  clearOperationFeedback()

  if (!dashboardSocket || dashboardSocket.readyState !== WebSocket.OPEN) {
    operationError.value = 'Dashboard WebSocket is not connected'
    return
  }

  dashboardActionPendingId.value = requestId
  try {
    dashboardSocket.send(JSON.stringify({ action, request_id: requestId }))
    markEscalationHandled(requestId)
    operationMessage.value = `Sent ${action.toUpperCase()} for ${requestId}`
  } catch {
    operationError.value = 'Failed to send dashboard action'
  } finally {
    dashboardActionPendingId.value = null
  }
}

function onHumanAction(event: FirewallDashboardEvent, action: 'allow' | 'block'): void {
  const requestId = dashboardRequestId(event)
  if (!requestId) {
    operationError.value = 'request_id missing for this event'
    return
  }
  void sendDashboardAction(action, requestId)
}

async function refresh(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  try {
    const [audit, traceList, datasetList, customConfig] = await Promise.all([
      firewallSupplementService.getAudit(25),
      firewallSupplementService.getTraces(25),
      firewallSupplementService.getDatasets(10),
      firewallSupplementService.getCustomConfig(),
    ])

    auditEntries.value = audit.entries ?? []
    traces.value = traceList.traces ?? []
    datasets.value = datasetList.datasets ?? []
    skills.value = customConfig.skills ?? []
    mcpServers.value = customConfig.mcp_servers ?? []
    lastUpdated.value = new Date()
  } catch (error) {
    errorMessage.value = toErrorMessage(error)
  } finally {
    loading.value = false
  }
}

async function addSkill(): Promise<void> {
  const id = newSkill.value.id.trim()
  if (!id) {
    operationError.value = 'Skill id is required'
    return
  }

  clearOperationFeedback()
  savingSkill.value = true
  try {
    await firewallSupplementService.upsertSkill({
      id,
      name: cleanText(newSkill.value.name),
      description: cleanText(newSkill.value.description),
    })
    operationMessage.value = `Skill ${id} saved`
    newSkill.value = { id: '', name: '', description: '' }
    await refresh()
  } catch (error) {
    operationError.value = toErrorMessage(error)
  } finally {
    savingSkill.value = false
  }
}

async function removeSkill(skillId: string): Promise<void> {
  clearOperationFeedback()
  deletingSkillId.value = skillId
  try {
    await firewallSupplementService.deleteSkill(skillId)
    operationMessage.value = `Skill ${skillId} deleted`
    await refresh()
  } catch (error) {
    operationError.value = toErrorMessage(error)
  } finally {
    deletingSkillId.value = null
  }
}

async function addMcpServer(): Promise<void> {
  const id = newServer.value.id.trim()
  if (!id) {
    operationError.value = 'MCP server id is required'
    return
  }

  clearOperationFeedback()
  savingServer.value = true
  try {
    await firewallSupplementService.upsertMcpServer({
      id,
      name: cleanText(newServer.value.name),
      transport: cleanText(newServer.value.transport),
      url: cleanText(newServer.value.url),
    })
    operationMessage.value = `MCP server ${id} saved`
    newServer.value = { id: '', name: '', transport: 'sse', url: '' }
    await refresh()
  } catch (error) {
    operationError.value = toErrorMessage(error)
  } finally {
    savingServer.value = false
  }
}

async function removeMcpServer(serverId: string): Promise<void> {
  clearOperationFeedback()
  deletingServerId.value = serverId
  try {
    await firewallSupplementService.deleteMcpServer(serverId)
    operationMessage.value = `MCP server ${serverId} deleted`
    await refresh()
  } catch (error) {
    operationError.value = toErrorMessage(error)
  } finally {
    deletingServerId.value = null
  }
}

onMounted(() => {
  void refresh()
  openDashboardStream()
})

onBeforeUnmount(() => {
  keepDashboardReconnect.value = false
  closeDashboardStream()
})
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
        <span>Dashboard Live Stream</span>
        <v-spacer />
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
