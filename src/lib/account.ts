import type { Config } from '../types.js'

export type ProjectSummary = { id: string; name: string; slug: string }

/** GET /api/account/projects with the resolved bearer credential. */
export async function listProjects(
  config: Pick<Config, 'apiUrl' | 'apiKey'>,
): Promise<{ ok: true; projects: ProjectSummary[] } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(`${config.apiUrl}/api/account/projects`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })
    const json = (await res.json().catch(() => ({}))) as {
      data?: ProjectSummary[]
      error?: string
    }
    if (!res.ok) {
      return { ok: false, status: res.status, error: json.error || `HTTP ${res.status}` }
    }
    return { ok: true, projects: Array.isArray(json.data) ? json.data : [] }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'network error',
    }
  }
}
