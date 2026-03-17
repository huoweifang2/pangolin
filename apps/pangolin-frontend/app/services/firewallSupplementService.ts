import axios from 'axios'
import type {
  FirewallAuditResponse,
  FirewallCustomConfigResponse,
  FirewallDatasetListResponse,
  FirewallTraceListResponse,
} from '../types/firewallSupplement'

const baseURL = import.meta.env.NUXT_PUBLIC_FIREWALL_API_BASE ?? 'http://localhost:9090'

const firewallApi = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Cannot reach Agent Firewall service'
    }
    const status = error.response.status
    return `Agent Firewall API error (${status})`
  }
  return 'Unexpected error while loading firewall supplement data'
}

export const firewallSupplementService = {
  baseURL,
  getAudit(limit = 25): Promise<FirewallAuditResponse> {
    return firewallApi
      .get<FirewallAuditResponse>('/api/audit', { params: { limit, offset: 0 } })
      .then((r) => r.data)
  },
  getTraces(limit = 25): Promise<FirewallTraceListResponse> {
    return firewallApi
      .get<FirewallTraceListResponse>('/api/v1/trace', { params: { limit, offset: 0 } })
      .then((r) => r.data)
  },
  getDatasets(limit = 10): Promise<FirewallDatasetListResponse> {
    return firewallApi
      .get<FirewallDatasetListResponse>('/api/v1/dataset', { params: { limit, offset: 0 } })
      .then((r) => r.data)
  },
  getCustomConfig(): Promise<FirewallCustomConfigResponse> {
    return firewallApi
      .get<FirewallCustomConfigResponse>('/api/custom-config')
      .then((r) => r.data)
  },
}

export { toErrorMessage }
