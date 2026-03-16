export function useFirewallApiBase(): string {
  return (import.meta.env.NUXT_PUBLIC_FIREWALL_API_BASE as string) ?? 'http://127.0.0.1:9090'
}

export function useFirewallFileServeUrl(): string {
  return `${useFirewallApiBase()}/api/file`
}

export async function firewallFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? undefined)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${useFirewallApiBase()}${path}`, {
    headers,
    ...init,
  })

  if (!res.ok) {
    throw new Error(`Firewall API error: ${res.status}`)
  }

  return res.json() as Promise<T>
}
