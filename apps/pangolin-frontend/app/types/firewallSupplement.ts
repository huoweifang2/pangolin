export interface FirewallAuditEntry {
  id: string
  timestamp: number
  session_id: string
  agent_id: string
  method: string
  verdict: string
  threat_level: string
  matched_patterns: string[]
  payload_hash: string
  payload_preview: string
}

export interface FirewallAuditResponse {
  entries: FirewallAuditEntry[]
  has_more: boolean
}

export interface FirewallTrace {
  id?: string
  trace_id?: string
  session_id?: string
  created_at?: string | number
  analysis?: {
    verdict?: string
    threat_level?: string
    score?: number
  }
}

export interface FirewallTraceListResponse {
  traces: FirewallTrace[]
  total: number
}

export interface FirewallDataset {
  id?: string
  name?: string
  description?: string
  is_public?: boolean
  traces?: string[]
  policies?: string[]
}

export interface FirewallDatasetListResponse {
  datasets: FirewallDataset[]
  total: number
}

export interface FirewallSkill {
  id: string
  name?: string
  description?: string
}

export interface FirewallMcpServer {
  id: string
  name?: string
  transport?: string
  url?: string
}

export interface FirewallCustomConfigResponse {
  mcp_servers: FirewallMcpServer[]
  skills: FirewallSkill[]
}
