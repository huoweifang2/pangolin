import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { api } from '~/services/api'
import type { Policy } from '~/types/api'

const LOCAL_POLICIES_KEY = 'pangolin.local.policies.v1'

const BUILTIN_POLICIES: Policy[] = [
  {
    id: 'builtin-fast',
    name: 'fast',
    description: 'Low latency with minimal filtering.',
    config: {
      nodes: ['static'],
      thresholds: { max_risk: 0.95 },
    },
    is_active: true,
    version: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-balanced',
    name: 'balanced',
    description: 'Recommended default with static + semantic checks.',
    config: {
      nodes: ['static', 'semantic'],
      thresholds: { max_risk: 0.7 },
    },
    is_active: true,
    version: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-strict',
    name: 'strict',
    description: 'High sensitivity for adversarial and policy risks.',
    config: {
      nodes: ['static', 'semantic', 'pii'],
      thresholds: { max_risk: 0.45 },
    },
    is_active: true,
    version: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-paranoid',
    name: 'paranoid',
    description: 'Maximum protection with aggressive blocking.',
    config: {
      nodes: ['static', 'semantic', 'pii', 'output-filter'],
      thresholds: { max_risk: 0.3 },
    },
    is_active: true,
    version: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
]

function nowIso(): string {
  return new Date().toISOString()
}

function readLocalCustomPolicies(): Policy[] {
  if (typeof window === 'undefined') {return []}
  try {
    const raw = localStorage.getItem(LOCAL_POLICIES_KEY)
    if (!raw) {return []}
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as Policy[] : []
  } catch {
    return []
  }
}

function writeLocalCustomPolicies(policies: Policy[]): void {
  if (typeof window === 'undefined') {return}
  localStorage.setItem(LOCAL_POLICIES_KEY, JSON.stringify(policies))
}

function mergePolicies(custom: Policy[]): Policy[] {
  return [...BUILTIN_POLICIES, ...custom]
}

async function loadPolicies(): Promise<Policy[]> {
  try {
    const response = await api.get<Policy[]>('/v1/policies?active_only=false')
    if (Array.isArray(response.data)) {
      return response.data
    }
    return mergePolicies(readLocalCustomPolicies())
  } catch {
    return mergePolicies(readLocalCustomPolicies())
  }
}

export const usePolicies = () => {
  const queryClient = useQueryClient()

  const { data: policies, isLoading, error, refetch } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: loadPolicies,
    staleTime: 0,
  })

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; description?: string; config?: Record<string, unknown> }) => {
      try {
        return await api.post<Policy>('/v1/policies', body).then(r => r.data)
      } catch {
        const custom = readLocalCustomPolicies()
        const policy: Policy = {
          id: `custom-${crypto.randomUUID()}`,
          name: body.name,
          description: body.description ?? null,
          config: body.config ?? {},
          is_active: true,
          version: 1,
          created_at: nowIso(),
          updated_at: nowIso(),
        }
        writeLocalCustomPolicies([...custom, policy])
        return policy
      }
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['policies'] }) },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      try {
        return await api.patch<Policy>(`/v1/policies/${id}`, body).then(r => r.data)
      } catch {
        const custom = readLocalCustomPolicies()
        const foundInCustom = custom.find((policy) => policy.id === id)
        if (foundInCustom) {
          const updated = {
            ...foundInCustom,
            ...body,
            version: foundInCustom.version + 1,
            updated_at: nowIso(),
          } as Policy
          writeLocalCustomPolicies(custom.map((policy) => policy.id === id ? updated : policy))
          return updated
        }

        const builtin = BUILTIN_POLICIES.find((policy) => policy.id === id)
        if (!builtin) {
          throw new Error('Policy not found')
        }
        return {
          ...builtin,
          ...body,
          version: builtin.version + 1,
          updated_at: nowIso(),
        } as Policy
      }
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['policies'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await api.delete(`/v1/policies/${id}`)
      } catch {
        const custom = readLocalCustomPolicies()
        const next = custom.filter((policy) => policy.id !== id)
        writeLocalCustomPolicies(next)
        return { data: { ok: true } }
      }
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['policies'] }) },
  })

  return {
    policies,
    isLoading,
    error,
    refetch,
    createPolicy: createMutation.mutateAsync,
    updatePolicy: updateMutation.mutateAsync,
    deletePolicy: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
