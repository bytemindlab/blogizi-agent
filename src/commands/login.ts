import chalk from 'chalk'
import {
  CONFIG_PATH,
  DEFAULT_API_URL,
  getConfig,
  saveConfig,
} from '../lib/config.js'
import {
  openBrowser,
  pollForDeviceToken,
  startDeviceAuthorization,
} from '../lib/oauth.js'
import { listProjects } from '../lib/account.js'

export async function loginCommand(
  options: { project?: string; apiUrl?: string; browser?: boolean } = {},
) {
  const existing = getConfig()
  const apiUrl = (
    options.apiUrl ||
    process.env.BLOGIZI_API_URL ||
    existing?.apiUrl ||
    DEFAULT_API_URL
  ).replace(/\/+$/, '')

  let auth
  try {
    auth = await startDeviceAuthorization(apiUrl)
  } catch (error) {
    console.error(
      chalk.red(
        `Could not start sign-in at ${apiUrl}: ${error instanceof Error ? error.message : error}`,
      ),
    )
    process.exit(1)
  }

  const url = auth.verification_uri_complete || auth.verification_uri
  console.log('')
  console.log('  Your sign-in code:')
  console.log('')
  console.log(chalk.bold(`      ${auth.user_code}`))
  console.log('')
  const opened = options.browser !== false && openBrowser(url)
  console.log(
    opened
      ? `  Opened ${chalk.cyan(auth.verification_uri)} in your browser.`
      : `  Open ${chalk.cyan(auth.verification_uri)} and enter the code above.`,
  )
  console.log(chalk.dim('  Check the code matches, then click Approve.'))
  console.log('')
  console.log(chalk.dim('  Waiting for approval…'))

  const result = await pollForDeviceToken(apiUrl, auth)
  if (!result.ok) {
    const messages: Record<string, string> = {
      access_denied: 'Sign-in was denied.',
      expired_token: 'The code expired. Run blogizi login again.',
      invalid_grant: 'The code is no longer valid. Run blogizi login again.',
    }
    console.error(chalk.red(messages[result.error] || `Sign-in failed: ${result.error}`))
    process.exit(1)
  }

  const tokens = result.tokens
  const projectSlug = options.project?.trim().toLowerCase() || existing?.projectSlug
  saveConfig({
    apiKey: '',
    apiUrl,
    projectSlug,
    authMethod: 'oauth',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
  })

  console.log(chalk.green('✓ Signed in to Blogizi'))

  const projects = await listProjects({ apiUrl, apiKey: tokens.access_token })
  if (projects.ok) {
    if (projects.projects.length === 1 && !projectSlug) {
      console.log(chalk.dim(`Publishing to: ${projects.projects[0].slug}`))
    } else if (projects.projects.length > 1 && !projectSlug) {
      console.log(chalk.dim('You have several blogs. Pick one with:'))
      for (const p of projects.projects) {
        console.log(chalk.dim(`  blogizi use ${p.slug}   # ${p.name}`))
      }
    } else if (projectSlug) {
      console.log(chalk.dim(`Active project: ${projectSlug}`))
    } else {
      console.log(chalk.dim('No blogs yet. Create one at blogizi.com/dashboard.'))
    }
  }
  console.log(chalk.dim(`Credentials saved to ${CONFIG_PATH}`))
}
