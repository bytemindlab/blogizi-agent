import { getConfig, saveConfig } from '../lib/config.js'
import chalk from 'chalk'

export async function authCommand(
  apiKey: string,
  options: { project?: string } = {},
) {
  const existing = getConfig()
  // Switching to an API key replaces any `blogizi login` session.
  saveConfig({
    apiKey,
    apiUrl: existing?.apiUrl || 'https://blogizi.com',
    projectSlug: options.project?.trim() || existing?.projectSlug,
    authMethod: 'api_key',
  })
  console.log(chalk.green('✓ Authenticated successfully'))
  if (options.project?.trim()) {
    console.log(chalk.dim(`Active project: ${options.project.trim()}`))
  } else if (!existing?.projectSlug) {
    console.log(
      chalk.dim(
        'If you have multiple projects, run: blogizi use <project-slug>',
      ),
    )
  }
  console.log(chalk.dim(`Config saved to ~/.blogizi/config.json`))
}
