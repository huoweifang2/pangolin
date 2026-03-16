export type Verdict = 'ALLOW' | 'BLOCK' | 'ESCALATE'

export type ThreatLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface AnalysisResult {
  request_id: string
  verdict: Verdict
  threat_level: ThreatLevel
  l1_matched_patterns: string[]
  l2_is_injection: boolean
  l2_confidence: number
  l2_reasoning: string
  blocked_reason: string
}

export interface FirewallEvent {
  event_type: string
  timestamp: number
  session_id: string
  agent_id: string
  method: string
  payload_preview: string
  analysis: AnalysisResult | null
  is_alert: boolean
}

export interface SkillRequirement {
  bins: string[]
  env: string[]
  config: string[]
  os: string[]
}

export interface SkillInstallOption {
  id: string
  kind: 'brew' | 'node' | 'go' | 'uv'
  label: string
  bins: string[]
}

export interface SkillStatusEntry {
  name: string
  description: string
  source: string
  filePath: string
  baseDir: string
  skillKey: string
  bundled?: boolean
  primaryEnv?: string
  emoji?: string
  homepage?: string
  always: boolean
  disabled: boolean
  blockedByAllowlist: boolean
  eligible: boolean
  requirements: SkillRequirement
  missing: SkillRequirement
  configChecks: { path: string; satisfied: boolean }[]
  install: SkillInstallOption[]
}

export interface SkillStatusReport {
  workspaceDir: string
  managedSkillsDir: string
  skills: SkillStatusEntry[]
}
