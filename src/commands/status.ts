import chalk from 'chalk'
import { CONFIG_PATH, getConfig, requireAuthConfig } from '../lib/config.js'
import { listProjects } from '../lib/account.js'

export async function statusCommand() {
  const stored = getConfig()
  const config = await requireAuthConfig()

  const method =
    stored?.authMethod === 'oauth' && stored.refreshToken
      ? 'Browser sign-in (blogizi login)'
      : stored?.apiKey
        ? 'Account API key (blogizi auth)'
        : 'BLOGIZI_API_KEY environment variable'

  console.log(`${chalk.dim('Auth:')}     ${method}`)
  console.log(`${chalk.dim('API:')}      ${config.apiUrl}`)
  console.log(`${chalk.dim('Project:')}  ${config.projectSlug || chalk.dim('(auto — only if you have one blog)')}`)
  if (stored) console.log(`${chalk.dim('Config:')}   ${CONFIG_PATH}`)

  const projects = await listProjects(config)
  if (!projects.ok) {
    if (projects.status === 401) {
      console.log(chalk.red('✗ Credentials were rejected. Run: blogizi login'))
    } else {
      console.log(chalk.yellow(`! Could not verify credentials: ${projects.error}`))
    }
    process.exitCode = 1
    return
  }
  console.log(chalk.green(`✓ Connected — ${projects.projects.length} blog(s)`))
  for (const p of projects.projects) {
    const active = p.slug === config.projectSlug ? chalk.green(' ← active') : ''
    console.log(`  ${p.slug}${chalk.dim(` · ${p.name}`)}${active}`)
  }
}
