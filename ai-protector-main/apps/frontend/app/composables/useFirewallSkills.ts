import { ref } from 'vue'
import { firewallFetch } from '~/composables/useFirewallApi'
import type { SkillStatusEntry, SkillStatusReport } from '~/types/firewall'

export function useGatewaySkills() {
  const skills = ref<SkillStatusEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadSkills() {
    loading.value = true
    error.value = null

    try {
      const report = await firewallFetch<SkillStatusReport>('/api/gateway/skills')
      skills.value = report.skills ?? []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load skills'
      skills.value = []
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
