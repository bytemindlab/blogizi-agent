import { saveConfig } from '../lib/config.js'
import chalk from 'chalk'

export async function authCommand(apiKey: string) {
  saveConfig({
    apiKey,
    apiUrl: 'https://blogizi.com',
  })
  console.log(chalk.green('✓ Authenticated successfully'))
  console.log(chalk.dim(`Config saved to ~/.blogizi/config.json`))
}
