<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { firewallSupplementService, toErrorMessage } from '../services/firewallSupplementService'
import type {
  FirewallAuditEntry,
  FirewallDataset,
  FirewallMcpServer,
  FirewallSkill,
  FirewallTrace,
} from '../types/firewallSupplement'

definePageMeta({ title: 'MCP Firewall' })

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const lastUpdated = ref<Date | null>(null)

const auditEntries = ref<FirewallAuditEntry[]>([])
const traces = ref<FirewallTrace[]>([])
const datasets = ref<FirewallDataset[]>([])
const skills = ref<FirewallSkill[]>([])
const mcpServers = ref<FirewallMcpServer[]>([])

const totalAudit = computed(() => auditEntries.value.length)
const totalTraces = computed(() => traces.value.length)
const totalDatasets = computed(() => datasets.value.length)
const totalSkills = computed(() => skills.value.length)
const totalServers = computed(() => mcpServers.value.length)

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

onMounted(() => {
  void refresh()
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
        <p v-if="lastUpdated" class="text-caption text-medium-emphasis mb-0">
          Last updated: {{ lastUpdated.toLocaleString() }}
        </p>
      </div>

      <v-spacer />

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
    </v-row>

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

          <div v-if="skills.length" class="pa-4 d-flex flex-wrap ga-2">
            <v-chip
              v-for="skill in skills"
              :key="skill.id"
              color="success"
              variant="tonal"
            >
              {{ skillLabel(skill) }}
            </v-chip>
          </div>

          <v-alert
            v-else-if="!loading"
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

          <v-list lines="two" density="compact">
            <v-list-item
              v-for="server in mcpServers"
              :key="server.id"
              :title="serverLabel(server)"
              :subtitle="server.url ?? 'No URL configured'"
            >
              <template #append>
                <v-chip size="x-small" variant="tonal" color="warning">
                  {{ server.transport ?? 'unknown' }}
                </v-chip>
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
