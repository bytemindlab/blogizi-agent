import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  chmodSync,
} from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import chalk from 'chalk'
import type { Config } from '../types.js'
import { refreshAccessToken } from './oauth.js'

export const DEFAULT_API_URL = 'https://blogizi.com'
const CONFIG_DIR = join(homedir(), '.blogizi')
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

/** Refresh the access token when it expires within this window. */
const REFRESH_SKEW_MS = 60_000

export function getConfig(): Config | null {
  if (!existsSync(CONFIG_PATH)) return null
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return null
  }
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  })
  // Tighten permissions even if the file already existed.
  try {
    chmodSync(CONFIG_PATH, 0o600)
  } catch {
    // best effort (e.g. Windows)
  }
}

/** Stored config only (used by `blogizi use`). */
export function requireConfig(): Config {
  const config = getConfig()
  if (!config || (!config.apiKey && config.authMethod !== 'oauth')) {
    console.error(
      'Not authenticated. Run: blogizi login (or blogizi auth <api-key>)',
    )
    process.exit(1)
  }
  return config
}

function notAuthenticated(): never {
  console.error(chalk.red('Not authenticated.'))
  console.error('Options:')
  console.error('  1. Sign in in the browser:  blogizi login')
  console.error('  2. Account API key:         blogizi auth <api-key>')
  console.error('  3. Environment variable:    export BLOGIZI_API_KEY=<api-key>')
  process.exit(1)
}

/**
 * Resolve credentials for an API call, in this order:
 *  1. `blogizi login` (OAuth) — refreshes the access token when needed
 *  2. `blogizi auth <key>` (stored account API key)
 *  3. BLOGIZI_API_KEY (+ optional BLOGIZI_API_URL, BLOGIZI_PROJECT) — for CI
 * The returned config always has `apiKey` set to the bearer to send.
 */
export async function requireAuthConfig(): Promise<Config> {
  const stored = getConfig()
  const envProject = process.env.BLOGIZI_PROJECT?.trim() || undefined

  if (stored?.authMethod === 'oauth' && stored.refreshToken) {
    let current = stored
    const expiresAt = current.accessTokenExpiresAt ?? 0
    if (!current.accessToken || expiresAt - REFRESH_SKEW_MS <= Date.now()) {
      const refreshed = await refreshAccessToken(
        current.apiUrl || DEFAULT_API_URL,
        current.refreshToken!,
      )
      if (!refreshed.ok) {
        if (refreshed.error === 'invalid_grant') {
          console.error(
            chalk.red('Your Blogizi session expired or was disconnected.'),
          )
          console.error('Run: blogizi login')
        } else {
          console.error(
            chalk.red(`Could not refresh your Blogizi session: ${refreshed.error}`),
          )
        }
        process.exit(1)
      }
      current = {
        ...current,
        accessToken: refreshed.tokens.access_token,
        refreshToken: refreshed.tokens.refresh_token,
        accessTokenExpiresAt: Date.now() + refreshed.tokens.expires_in * 1000,
      }
      saveConfig(current)
    }
    return {
      ...current,
      apiKey: current.accessToken!,
      apiUrl: current.apiUrl || DEFAULT_API_URL,
      projectSlug: envProject || current.projectSlug,
    }
  }

  if (stored?.apiKey) {
    return {
      ...stored,
      apiUrl: stored.apiUrl || DEFAULT_API_URL,
      projectSlug: envProject || stored.projectSlug,
    }
  }

  const envKey = process.env.BLOGIZI_API_KEY?.trim()
  if (envKey) {
    return {
      apiKey: envKey,
      apiUrl: (process.env.BLOGIZI_API_URL || DEFAULT_API_URL).replace(/\/+$/, ''),
      projectSlug: envProject,
      authMethod: 'api_key',
    }
  }

  notAuthenticated()
}
