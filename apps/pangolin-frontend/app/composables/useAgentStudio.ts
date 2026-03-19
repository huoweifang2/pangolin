import { computed, ref } from 'vue'
import { agentStudioService } from '~/services/agentStudioService'
import type {
  AgentStudioProfile,
  AgentStudioRunDetail,
  AgentStudioRunSummary,
  AgentStudioAgentResultEvent,
  AgentStudioStreamEvent,
} from '~/types/agentStudio'

interface StudioLogEntry {
  id: string
  type: 'stage' | 'delegation' | 'result' | 'synthesis' | 'error' | 'done' | 'run'
  title: string
  detail: string
  at: string
}

function logNow(): string {
  return new Date().toLocaleTimeString()
}

function makeLog(
  type: StudioLogEntry['type'],
  title: string,
  detail: string,
): StudioLogEntry {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    detail,
    at: logNow(),
  }
}

export function useAgentStudio() {
  const profiles = ref<AgentStudioProfile[]>([])
  const selectedAgentIds = ref<string[]>([])
  const task = ref('')
  const model = ref('openrouter/auto')
  const maxParallel = ref(3)

  const isBootstrapping = ref(false)
  const isRunning = ref(false)
  const loadingRuns = ref(false)
  const error = ref<string | null>(null)

  const currentRunId = ref<string | null>(null)
  const finalReport = ref('')
  const logs = ref<StudioLogEntry[]>([])
  const resultEvents = ref<AgentStudioAgentResultEvent['result'][]>([])

  const runs = ref<AgentStudioRunSummary[]>([])
  const totalRuns = ref(0)
  const selectedRunDetail = ref<AgentStudioRunDetail | null>(null)

  let abortController: AbortController | null = null

  const canRun = computed(() => {
    return task.value.trim().length > 0 && !isRunning.value
  })

  const selectedProfiles = computed(() => {
    const selected = new Set(selectedAgentIds.value)
    return profiles.value.filter((profile) => selected.has(profile.id))
  })

  async function loadProfiles(): Promise<void> {
    isBootstrapping.value = true
    error.value = null
    try {
      const loaded = await agentStudioService.listProfiles()
      profiles.value = loaded
      if (selectedAgentIds.value.length === 0) {
        selectedAgentIds.value = loaded.map((profile) => profile.id)
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      isBootstrapping.value = false
    }
  }

  async function loadRuns(): Promise<void> {
    loadingRuns.value = true
    try {
      const payload = await agentStudioService.listRuns(20, 0)
      runs.value = payload.items
      totalRuns.value = payload.total
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loadingRuns.value = false
    }
  }

  async function openRun(runId: string): Promise<void> {
    try {
      selectedRunDetail.value = await agentStudioService.getRun(runId)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  function clearLiveRunState(): void {
    currentRunId.value = null
    finalReport.value = ''
    logs.value = []
    resultEvents.value = []
    error.value = null
  }

  function onStreamEvent(event: AgentStudioStreamEvent): void {
    switch (event.type) {
      case 'run_started': {
        currentRunId.value = event.run.id
        logs.value.unshift(
          makeLog('run', 'Run started', `${event.run.id} (${event.run.model})`),
        )
        break
      }
      case 'stage_started': {
        const stageEvent = event
        logs.value.unshift(
          makeLog(
            'stage',
            `Stage ${stageEvent.stage.index}`,
            stageEvent.stage.agents.join(', '),
          ),
        )
        break
      }
      case 'agent_delegation': {
        const delegation = (event).event
        logs.value.unshift(
          makeLog(
            'delegation',
            `${delegation.from_agent} -> ${delegation.to_agent_name}`,
            delegation.objective,
          ),
        )
        break
      }
      case 'agent_result': {
        const result = (event).result
        resultEvents.value.unshift(result)
        logs.value.unshift(
          makeLog(
            'result',
            `${result.agent_name} completed`,
            `${result.tool_calls} tool call(s), ${result.blocked_tool_calls} blocked`,
          ),
        )
        break
      }
      case 'synthesis': {
        finalReport.value = event.result.content
        logs.value.unshift(
          makeLog(
            'synthesis',
            `Final synthesis by ${event.result.agent_name}`,
            'Consolidated delivery package generated',
          ),
        )
        break
      }
      case 'error': {
        error.value = event.error
        logs.value.unshift(makeLog('error', 'Run error', event.error))
        break
      }
      case 'done': {
        logs.value.unshift(
          makeLog('done', `Run ${event.status}`, `Run ID: ${event.run_id}`),
        )
        break
      }
      default:
        break
    }
  }

  async function startRun(): Promise<void> {
    if (!canRun.value) {
      return
    }

    clearLiveRunState()
    isRunning.value = true
    abortController = new AbortController()

    try {
      await agentStudioService.streamRun(
        {
          task: task.value.trim(),
          model: model.value,
          agent_ids: selectedAgentIds.value,
          max_parallel: maxParallel.value,
        },
        {
          onEvent: onStreamEvent,
          onError: (err) => {
            error.value = err.message
          },
          onDone: () => {
            isRunning.value = false
          },
        },
        abortController.signal,
      )
      await loadRuns()
      if (currentRunId.value) {
        await openRun(currentRunId.value)
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      isRunning.value = false
      abortController = null
    }
  }

  function stopRun(): void {
    if (abortController) {
      abortController.abort()
      abortController = null
      isRunning.value = false
      logs.value.unshift(makeLog('done', 'Run aborted', 'Stopped by user'))
    }
  }

  async function bootstrap(): Promise<void> {
    await Promise.all([loadProfiles(), loadRuns()])
  }

  return {
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
    totalRuns,
    selectedRunDetail,
    canRun,
    bootstrap,
    loadProfiles,
    loadRuns,
    openRun,
    clearLiveRunState,
    startRun,
    stopRun,
  }
}
