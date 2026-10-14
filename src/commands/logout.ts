import chalk from 'chalk'
import { DEFAULT_API_URL, getConfig, saveConfig } from '../lib/config.js'
import { revokeToken } from '../lib/oauth.js'

export async function logoutCommand() {
  const config = getConfig()
  if (!config || (!config.apiKey && !config.refreshToken)) {
    console.log(chalk.dim('Not signed in.'))
    return
  }

  if (config.authMethod === 'oauth' && config.refreshToken) {
    // Revoking the refresh token ends the whole session server-side.
    await revokeToken(config.apiUrl || DEFAULT_API_URL, config.refreshToken)
  }

  // Keep the API URL and active project so `blogizi login` picks them up again.
  saveConfig({
    apiKey: '',
    apiUrl: config.apiUrl || DEFAULT_API_URL,
    projectSlug: config.projectSlug,
  })
  console.log(chalk.green('✓ Signed out'))
  if (config.authMethod !== 'oauth') {
    console.log(
      chalk.dim(
        'Your account API key still works elsewhere. Regenerate it in Dashboard → Account → API to revoke it.',
      ),
    )
  }
}
