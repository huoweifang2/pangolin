<template>
  <v-container fluid class="pa-0 agent-studio">
    <v-row class="ma-0 fill-height" dense>
      <v-col cols="12" lg="8" class="pa-3 d-flex flex-column ga-3">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-robot-multiple</v-icon>
            Agent Studio
            <v-spacer />
            <v-chip size="small" variant="tonal" color="primary">
              {{ selectedProfiles.length }} active agents
            </v-chip>
          </v-card-title>

          <v-card-text>
            <v-textarea
              v-model="task"
              label="Human task"
              placeholder="Example: design a website, check Feishu requirements, research online, draft copy, and produce financial analysis"
              rows="4"
              auto-grow
              density="comfortable"
              variant="outlined"
              :disabled="isRunning"
            />

            <v-row dense class="mt-1">
              <v-col cols="12" md="8">
                <v-select
                  v-model="model"
                  label="Model"
                  :items="modelItems"
                  item-title="title"
                  item-value="value"
                  density="comfortable"
                  variant="outlined"
                  :disabled="isRunning"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="maxParallel"
                  label="Max parallel"
                  :items="[1, 2, 3, 4]"
                  density="comfortable"
                  variant="outlined"
                  :disabled="isRunning"
                />
              </v-col>
            </v-row>

            <div class="text-caption text-medium-emphasis mb-2">Core agent roster</div>
            <v-chip-group v-model="selectedAgentIds" multiple column :disabled="isRunning">
              <v-chip
                v-for="profile in profiles"
                :key="profile.id"
                :value="profile.id"
                filter
                variant="outlined"
                class="ma-1"
              >
                {{ profile.emoji }} {{ profile.name }}
              </v-chip>
            </v-chip-group>

            <div class="d-flex ga-2 mt-4">
              <v-btn
                color="primary"
                prepend-icon="mdi-play"
                :disabled="!canRun || isBootstrapping"
                :loading="isRunning"
                @click="startRun"
              >
                Start orchestration
              </v-btn>
              <v-btn
                variant="tonal"
                color="warning"
                prepend-icon="mdi-stop"
                :disabled="!isRunning"
                @click="stopRun"
              >
                Stop
              </v-btn>
            </div>

            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mt-3"
            >
              {{ error }}
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card class="flex-grow-1">
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-timeline-clock</v-icon>
            Live delegation timeline
            <v-spacer />
            <v-chip size="small" variant="tonal">{{ logs.length }}</v-chip>
          </v-card-title>
          <v-divider />

          <v-card-text class="timeline-pane">
            <v-alert
              v-if="logs.length === 0"
              type="info"
              variant="tonal"
            >
              Start a run to see multi-agent delegation and execution events.
            </v-alert>

            <v-timeline v-else density="compact" align="start" side="end">
              <v-timeline-item
                v-for="entry in logs"
                :key="entry.id"
                size="small"
                dot-color="primary"
              >
                <div class="d-flex align-center ga-2 mb-1">
                  <strong>{{ entry.title }}</strong>
                  <v-chip size="x-small" variant="outlined">{{ entry.at }}</v-chip>
                </div>
                <div class="text-body-2 text-medium-emphasis">{{ entry.detail }}</div>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-file-document-multiple</v-icon>
            Specialist artifacts
            <v-spacer />
            <v-chip size="small" variant="tonal">{{ resultEvents.length }}</v-chip>
          </v-card-title>
          <v-divider />

          <v-expansion-panels variant="accordion">
            <v-expansion-panel
              v-for="result in resultEvents"
              :key="result.step_id"
              :title="`${result.agent_name} · ${result.objective}`"
              :text="result.content || '(empty output)'"
            >
              <template #text>
                <div class="text-caption text-medium-emphasis mb-2">
                  Tool calls: {{ result.tool_calls }} · Blocked: {{ result.blocked_tool_calls }}
                </div>
                <div class="text-body-2 agent-result-content">{{ result.content || '(empty output)' }}</div>
              </template>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4" class="pa-3 d-flex flex-column ga-3">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-history</v-icon>
            Run history
            <v-spacer />
            <v-btn
              icon="mdi-refresh"
              variant="text"
              size="small"
              :loading="loadingRuns"
              @click="loadRuns"
            />
          </v-card-title>
          <v-divider />

          <v-list v-if="runs.length > 0" lines="two" density="compact" max-height="340" class="overflow-y-auto">
            <v-list-item
              v-for="run in runs"
              :key="run.id"
              :title="run.task"
              :subtitle="`${run.status} · artifacts ${run.artifact_count}`"
              @click="openRun(run.id)"
            >
              <template #append>
                <v-chip size="x-small" :color="run.status === 'completed' ? 'success' : 'warning'" variant="tonal">
                  {{ run.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>

          <v-alert v-else type="info" variant="tonal" class="ma-4">
            No orchestration runs yet.
          </v-alert>
        </v-card>

        <v-card class="flex-grow-1">
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-notebook-multiple</v-icon>
            Final report
            <v-spacer />
            <v-chip v-if="currentRunId" size="x-small" variant="outlined">{{ currentRunId }}</v-chip>
          </v-card-title>
          <v-divider />

          <v-card-text class="report-pane">
            <div v-if="finalReport" class="text-body-2 whitespace-pre-wrap">{{ finalReport }}</div>
            <div v-else-if="selectedRunDetail?.final_report" class="text-body-2 whitespace-pre-wrap">
              {{ selectedRunDetail.final_report }}
            </div>
            <v-alert v-else type="info" variant="tonal">
              Final synthesis report will appear here.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useModels } from '~/composables/useModels'
import { useAgentStudio } from '~/composables/useAgentStudio'

const {
  profiles,
  selectedAgentIds,
  selectedProfiles,
  task,
  model,
  maxParallel,
  isBootstrapping,
  isRunning,
  loadingRuns,
  error,
  currentRunId,
  finalReport,
  logs,
  resultEvents,
  runs,
  selectedRunDetail,
  canRun,
  bootstrap,
  loadRuns,
  openRun,
  startRun,
  stopRun,
} = useAgentStudio()

const { groupedModels, refreshAvailability } = useModels()

const modelItems = computed(() => {
  return (groupedModels.value ?? [])
    .filter((item) => item.available)
    .map((item) => ({
      title: `${item.name} · ${item.provider}`,
      value: item.id,
    }))
})

onMounted(async () => {
  await refreshAvailability()
  await bootstrap()

  if (!model.value) {
    const first = modelItems.value[0]
    model.value = first?.value ?? 'openrouter/auto'
  }
})
</script>

<style scoped>
.agent-studio {
  min-height: calc(100vh - 140px);
}

.timeline-pane {
  max-height: 360px;
  overflow-y: auto;
}

.report-pane {
  max-height: 420px;
  overflow-y: auto;
}

.agent-result-content {
  white-space: pre-wrap;
}

.whitespace-pre-wrap {
  white-space: pre-wrap;
}
</style>
