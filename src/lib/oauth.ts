import { spawn } from 'child_process'

/** First-party public client registered on the Blogizi authorization server. */
export const CLI_CLIENT_ID = 'blogizi-cli'
const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code'

export type TokenSet = {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope?: string
}

export type DeviceAuthorization = {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  expires_in: number
  interval?: number
}

type Result<T> = { ok: true; tokens: T } | { ok: false; error: string }

async function postForm(url: string, body: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(body).toString(),
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { res, json }
}

export async function startDeviceAuthorization(
  apiUrl: string,
): Promise<DeviceAuthorization> {
  const { res, json } = await postForm(`${apiUrl}/api/oauth/device/code`, {
    client_id: CLI_CLIENT_ID,
    scope: 'blogizi',
  })
  if (!res.ok || typeof json.device_code !== 'string') {
    const message =
      (json.error_description as string) ||
      (json.error as string) ||
      `HTTP ${res.status}`
    throw new Error(message)
  }
  return json as unknown as DeviceAuthorization
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Poll the token endpoint until the user approves or denies the code
 * (RFC 8628 §3.4–3.5), honouring `interval` and `slow_down`.
 */
export async function pollForDeviceToken(
  apiUrl: string,
  auth: DeviceAuthorization,
): Promise<Result<TokenSet>> {
  let interval = Math.max(auth.interval ?? 5, 1)
  const deadline = Date.now() + auth.expires_in * 1000

  while (Date.now() < deadline) {
    await sleep(interval * 1000)
    let res: Response
    let json: Record<string, unknown>
    try {
      ;({ res, json } = await postForm(`${apiUrl}/api/oauth/token`, {
        grant_type: DEVICE_CODE_GRANT,
        device_code: auth.device_code,
        client_id: CLI_CLIENT_ID,
      }))
    } catch {
      continue // transient network error: keep polling
    }

    if (res.ok && typeof json.access_token === 'string') {
      return { ok: true, tokens: json as unknown as TokenSet }
    }
    const error = (json.error as string) || `http_${res.status}`
    if (error === 'authorization_pending') continue
    if (error === 'slow_down') {
      interval += 5
      continue
    }
    return { ok: false, error }
  }
  return { ok: false, error: 'expired_token' }
}

export async function refreshAccessToken(
  apiUrl: string,
  refreshToken: string,
): Promise<Result<TokenSet>> {
  try {
    const { res, json } = await postForm(`${apiUrl}/api/oauth/token`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLI_CLIENT_ID,
    })
    if (res.ok && typeof json.access_token === 'string') {
      return { ok: true, tokens: json as unknown as TokenSet }
    }
    return { ok: false, error: (json.error as string) || `HTTP ${res.status}` }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'network error',
    }
  }
}

/** RFC 7009 revocation; failures are ignored (logout still clears locally). */
export async function revokeToken(apiUrl: string, token: string): Promise<void> {
  try {
    await postForm(`${apiUrl}/api/oauth/revoke`, {
      token,
      client_id: CLI_CLIENT_ID,
    })
  } catch {
    // ignore
  }
}

/** Best-effort: open a URL in the default browser. Returns false if it can't. */
export function openBrowser(url: string): boolean {
  const platform = process.platform
  const isHeadlessLinux =
    platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY
  if (isHeadlessLinux || process.env.SSH_CONNECTION) return false

  const [cmd, args] =
    platform === 'darwin'
      ? ['open', [url]]
      : platform === 'win32'
        ? ['cmd', ['/c', 'start', '""', url]]
        : ['xdg-open', [url]]
  try {
    const child = spawn(cmd, args as string[], {
      stdio: 'ignore',
      detached: true,
    })
    child.on('error', () => {})
    child.unref()
    return true
  } catch {
    return false
  }
}
