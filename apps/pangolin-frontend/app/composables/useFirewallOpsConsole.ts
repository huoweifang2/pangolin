import { computed, inject, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import type { InjectionKey } from 'vue'
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

export interface EscalationItem {
  requestId: string
  event: FirewallDashboardEvent
  verdict: string
}

export type DashboardViewMode = 'all' | 'alert' | 'escalate'
export type DashboardThreatFilter = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'none'
export type HumanActionType = 'allow' | 'block' | 'ack'

export interface ActionHistoryItem {
  requestId: string
  action: HumanActionType
  timestamp: number
}

const HANDLED_REQUEST_STORAGE_KEY = 'pangolin.firewall.handled-requests.v1'
const DASHBOARD_FILTER_STORAGE_KEY = 'pangolin.firewall.dashboard-filters.v1'

export function useFirewallOpsConsole() {
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

  const savingSkill = ref(false)
  const deletingSkillId = ref<string | null>(null)
  const savingServer = ref(false)
  const deletingServerId = ref<string | null>(null)
  const streamPaused = ref(false)
  const dashboardViewMode = ref<DashboardViewMode>('all')
  const dashboardThreatFilter = ref<DashboardThreatFilter>('all')
  const dashboardActionableOnly = ref(false)
  const dashboardQuery = ref('')
  const actionHistory = ref<ActionHistoryItem[]>([])

  const dashboardThreatFilterOptions: Array<{ title: string; value: DashboardThreatFilter }> = [
    { title: 'All Threat Levels', value: 'all' },
    { title: 'Critical', value: 'critical' },
    { title: 'High', value: 'high' },
    { title: 'Medium', value: 'medium' },
    { title: 'Low', value: 'low' },
    { title: 'None', value: 'none' },
  ]

  const newSkill = ref<FirewallSkillInput>({ id: '', name: '', description: '' })
  const newServer = ref<FirewallMcpServerInput>({ id: '', name: '', transport: 'sse', url: '' })
  const transportOptions = ['sse', 'stdio', 'http', 'websocket']

  const totalAudit = computed(() => auditEntries.value.length)
  const totalTraces = computed(() => traces.value.length)
  const totalDatasets = computed(() => datasets.value.length)
  const totalSkills = computed(() => skills.value.length)
  const totalServers = computed(() => mcpServers.value.length)
  const dashboardEventCount = computed(() => dashboardEvents.value.length)
  const normalizedDashboardQuery = computed(() => dashboardQuery.value.trim().toLowerCase())
  const filteredDashboardEvents = computed(() => {
    const query = normalizedDashboardQuery.value
    const threatFilter = dashboardThreatFilter.value
    const modeFilteredEvents =
      dashboardViewMode.value === 'alert'
        ? dashboardEvents.value.filter((event) => event.is_alert)
        : dashboardViewMode.value === 'escalate'
          ? dashboardEvents.value.filter((event) => dashboardVerdict(event) === 'ESCALATE')
          : dashboardEvents.value

    const threatFilteredEvents = threatFilter === 'all'
      ? modeFilteredEvents
      : modeFilteredEvents.filter((event) => eventMatchesThreatFilter(event, threatFilter))

    const actionableFilteredEvents = dashboardActionableOnly.value
      ? threatFilteredEvents.filter((event) => canResolveEvent(event))
      : threatFilteredEvents

    if (!query) {
      return actionableFilteredEvents
    }

    return actionableFilteredEvents.filter((event) => eventMatchesQuery(event, query))
  })
  const recentDashboardEvents = computed(() => filteredDashboardEvents.value.slice(0, 12))

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

  const pendingEscalations = computed(() => {
    const filtered = escalationItems.value.filter(
      (item) => item.verdict === 'ESCALATE' && !handledRequestIds.value.includes(item.requestId),
    )
    return filtered.toSorted((left, right) => {
      const threatDelta = threatRank(dashboardThreat(right.event)) - threatRank(dashboardThreat(left.event))
      if (threatDelta !== 0) {
        return threatDelta
      }
      return dashboardEventTimestamp(right.event) - dashboardEventTimestamp(left.event)
    })
  })

  const totalPendingEscalations = computed(() => pendingEscalations.value.length)
  const visiblePendingEscalations = computed(() => {
    const query = normalizedDashboardQuery.value
    const threatFilter = dashboardThreatFilter.value
    const threatFilteredEscalations = threatFilter === 'all'
      ? pendingEscalations.value
      : pendingEscalations.value.filter((item) => eventMatchesThreatFilter(item.event, threatFilter))

    if (!query) {
      return threatFilteredEscalations
    }
    return threatFilteredEscalations.filter((item) => escalationMatchesQuery(item, query))
  })
  const recentActionHistory = computed(() => actionHistory.value.slice(0, 12))

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
    if (timestamp == null) {return 'n/a'}

    const value = typeof timestamp === 'number' ? timestamp * 1000 : Date.parse(timestamp)
    if (Number.isNaN(value)) {return String(timestamp)}

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

  function includesQuery(value: string | null | undefined, query: string): boolean {
    return String(value ?? '').toLowerCase().includes(query)
  }

  function eventMatchesQuery(event: FirewallDashboardEvent, query: string): boolean {
    return (
      includesQuery(dashboardRequestId(event), query)
      || includesQuery(dashboardMethod(event), query)
      || includesQuery(dashboardVerdict(event), query)
      || includesQuery(dashboardThreat(event), query)
      || includesQuery(event.session_id, query)
    )
  }

  function escalationMatchesQuery(item: EscalationItem, query: string): boolean {
    return includesQuery(item.requestId, query) || eventMatchesQuery(item.event, query)
  }

  function eventMatchesThreatFilter(event: FirewallDashboardEvent, filter: DashboardThreatFilter): boolean {
    if (filter === 'all') {
      return true
    }
    return dashboardThreat(event).toLowerCase() === filter
  }

  function clearOperationFeedback(): void {
    operationError.value = null
    operationMessage.value = null
  }

  function dashboardEventTimestamp(event: FirewallDashboardEvent): number {
    const raw = event.timestamp
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw
    }
    if (typeof raw === 'string') {
      const parsed = Date.parse(raw)
      if (!Number.isNaN(parsed)) {
        return parsed / 1000
      }
    }
    return 0
  }

  function threatRank(level: string): number {
    const rank: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
      NONE: 0,
    }
    return rank[level] ?? 0
  }

  function actionLabel(action: HumanActionType): string {
    if (action === 'allow') {return 'ALLOW'}
    if (action === 'block') {return 'BLOCK'}
    return 'ACK'
  }

  function actionColor(action: HumanActionType): string {
    if (action === 'allow') {return 'success'}
    if (action === 'block') {return 'error'}
    return 'grey'
  }

  function pushActionHistory(action: HumanActionType, requestId: string): void {
    actionHistory.value = [{ action, requestId, timestamp: Date.now() / 1000 }, ...actionHistory.value].slice(0, 100)
  }

  function loadHandledRequestIdsFromStorage(): void {
    if (!import.meta.client) {
      return
    }

    try {
      const raw = localStorage.getItem(HANDLED_REQUEST_STORAGE_KEY)
      if (!raw) {
        return
      }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        handledRequestIds.value = parsed.filter((value): value is string => typeof value === 'string').slice(0, 200)
      }
    } catch {
      // Ignore local storage parsing failures.
    }
  }

  function persistHandledRequestIdsToStorage(): void {
    if (!import.meta.client) {
      return
    }

    try {
      localStorage.setItem(HANDLED_REQUEST_STORAGE_KEY, JSON.stringify(handledRequestIds.value.slice(0, 200)))
    } catch {
      // Ignore storage quota errors.
    }
  }

  function loadDashboardFiltersFromStorage(): void {
    if (!import.meta.client) {
      return
    }

    try {
      const raw = localStorage.getItem(DASHBOARD_FILTER_STORAGE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as {
        query?: string
        viewMode?: DashboardViewMode
        threatFilter?: DashboardThreatFilter
        actionableOnly?: boolean
      }

      if (typeof parsed.query === 'string') {
        dashboardQuery.value = parsed.query.slice(0, 120)
      }
      if (parsed.viewMode === 'all' || parsed.viewMode === 'alert' || parsed.viewMode === 'escalate') {
        dashboardViewMode.value = parsed.viewMode
      }
      if (dashboardThreatFilterOptions.some((option) => option.value === parsed.threatFilter)) {
        dashboardThreatFilter.value = parsed.threatFilter as DashboardThreatFilter
      }
      if (typeof parsed.actionableOnly === 'boolean') {
        dashboardActionableOnly.value = parsed.actionableOnly
      }
    } catch {
      // Ignore local storage parsing failures.
    }
  }

  function persistDashboardFiltersToStorage(): void {
    if (!import.meta.client) {
      return
    }

    try {
      localStorage.setItem(
        DASHBOARD_FILTER_STORAGE_KEY,
        JSON.stringify({
          query: dashboardQuery.value,
          viewMode: dashboardViewMode.value,
          threatFilter: dashboardThreatFilter.value,
          actionableOnly: dashboardActionableOnly.value,
        }),
      )
    } catch {
      // Ignore storage quota errors.
    }
  }

  function toggleStreamPaused(): void {
    streamPaused.value = !streamPaused.value
  }

  function setDashboardViewMode(mode: DashboardViewMode): void {
    dashboardViewMode.value = mode
  }

  function resetDashboardFilters(): void {
    dashboardQuery.value = ''
    dashboardViewMode.value = 'all'
    dashboardThreatFilter.value = 'all'
    dashboardActionableOnly.value = false
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
    if (streamPaused.value) {
      return
    }
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

    socket.addEventListener('open', () => {
      clearDashboardReconnectTimer()
      dashboardReconnectAttempts.value = 0
      dashboardConnected.value = true
      dashboardError.value = null
    })

    socket.addEventListener('close', () => {
      if (dashboardSocket !== socket) {
        return
      }
      dashboardSocket = null
      dashboardConnected.value = false
      scheduleDashboardReconnect()
    })

    socket.addEventListener('error', () => {
      dashboardError.value = 'Dashboard WebSocket connection error'
    })

    socket.addEventListener('message', (message) => {
      try {
        const parsed = JSON.parse(String(message.data)) as FirewallDashboardEvent
        pushDashboardEvent(parsed)
      } catch {
        // Ignore malformed events from mixed environments.
      }
    })
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
    operationMessage.value = `Cleared ${queueIds.length} pending escalation(s)`
  }

  function escalationSubtitle(item: EscalationItem): string {
    return `${dashboardMethod(item.event)} · ${dashboardThreat(item.event)} · ${formatTimestamp(item.event.timestamp)}`
  }

  function resolveEscalation(item: EscalationItem, action: 'allow' | 'block'): void {
    void sendDashboardAction(action, item.requestId)
  }

  function acknowledgeEscalation(item: EscalationItem): void {
    markEscalationHandled(item.requestId)
    pushActionHistory('ack', item.requestId)
    operationMessage.value = `Acknowledged ${item.requestId}`
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
      pushActionHistory(action, requestId)
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
    loadHandledRequestIdsFromStorage()
    loadDashboardFiltersFromStorage()
    void refresh()
    openDashboardStream()
  })

  watch(handledRequestIds, () => {
    persistHandledRequestIdsToStorage()
  })

  watch([dashboardQuery, dashboardViewMode, dashboardThreatFilter, dashboardActionableOnly], () => {
    persistDashboardFiltersToStorage()
  })

  onBeforeUnmount(() => {
    keepDashboardReconnect.value = false
    closeDashboardStream()
  })

  return {
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
    dashboardEvents,
    dashboardActionPendingId,
    dashboardReconnectAttempts,
    dashboardReconnectDelaySeconds,
    streamPaused,
    dashboardViewMode,
    dashboardThreatFilter,
    dashboardActionableOnly,
    dashboardQuery,
    dashboardThreatFilterOptions,
    actionHistory,
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
    visiblePendingEscalations,
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
    resetDashboardFilters,
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
  }
}

export type FirewallOpsConsoleState = ReturnType<typeof useFirewallOpsConsole>

const firewallOpsConsoleKey: InjectionKey<FirewallOpsConsoleState> = Symbol('firewall-ops-console')

export function provideFirewallOpsConsole(state: FirewallOpsConsoleState): void {
  provide(firewallOpsConsoleKey, state)
}

export function useInjectedFirewallOpsConsole(): FirewallOpsConsoleState {
  const state = inject(firewallOpsConsoleKey)
  if (!state) {
    throw new Error('Firewall ops console context is not available')
  }
  return state
}
