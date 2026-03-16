import { ref } from 'vue'
import { firewallFetch } from '~/composables/useFirewallApi'
import type { SkillStatusEntry, SkillStatusReport } from '~/types/firewall'

interface McpToolSkillItem {
  name?: string
  description?: string
  emoji?: string
  bins?: string[]
  source?: string
}

interface McpToolsResponse {
  skills?: McpToolSkillItem[]
  gateway_tools?: McpToolSkillItem[]
}

function toSkillKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown-skill'
}

function toSkillEntry(item: McpToolSkillItem): SkillStatusEntry {
  const name = String(item.name ?? '').trim() || 'unknown-skill'
  return {
    name,
    description: String(item.description ?? ''),
    source: String(item.source ?? 'skill'),
    filePath: '',
    baseDir: '',
    skillKey: toSkillKey(name),
    bundled: true,
    primaryEnv: '',
    emoji: item.emoji,
    homepage: '',
    always: false,
    disabled: false,
    blockedByAllowlist: false,
    eligible: true,
    requirements: {
      bins: Array.isArray(item.bins) ? item.bins : [],
      env: [],
      config: [],
      os: [],
    },
    missing: {
      bins: [],
      env: [],
      config: [],
      os: [],
    },
    configChecks: [],
    install: [],
  }
}

export function useGatewaySkills() {
  const skills = ref<SkillStatusEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadSkills() {
    loading.value = true
    error.value = null

    try {
      const report = await firewallFetch<SkillStatusReport>('/api/gateway/skills')
      skills.value = Array.isArray(report.skills) ? report.skills : []
      return
    } catch (err) {
      const primaryError = err instanceof Error ? err.message : 'Failed to load skills'

      try {
        const fallback = await firewallFetch<McpToolsResponse>('/api/mcp/tools')
        const sourceSkills = Array.isArray(fallback.skills)
          ? fallback.skills
          : Array.isArray(fallback.gateway_tools)
          ? fallback.gateway_tools
          : []

        skills.value = sourceSkills
          .filter((item) => typeof item?.name === 'string' && item.name.trim().length > 0)
          .map(toSkillEntry)

        if (skills.value.length === 0) {
          throw new Error('No compatible skill entries found in /api/mcp/tools', { cause: err })
        }
      } catch (fallbackErr) {
        const fallbackMessage =
          fallbackErr instanceof Error ? fallbackErr.message : 'Fallback skill loading failed'
        error.value = `${primaryError}; fallback: ${fallbackMessage}`
        skills.value = []
      }
    } finally {
      loading.value = false
    }
  }

  return {
    skills,
    loading,
    error,
    loadSkills,
  }
}
