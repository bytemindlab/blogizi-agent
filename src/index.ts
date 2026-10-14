#!/usr/bin/env node
import { Command } from 'commander'
import { authCommand } from './commands/auth.js'
import { loginCommand } from './commands/login.js'
import { logoutCommand } from './commands/logout.js'
import { statusCommand } from './commands/status.js'
import { draftCommand } from './commands/draft.js'
import { publishCommand } from './commands/publish.js'
import { updateCommand } from './commands/update.js'
import { uploadCommand } from './commands/upload.js'
import { useCommand } from './commands/use.js'

const program = new Command()

program
  .name('blogizi')
  .description('Draft, update, and publish markdown posts to your Blogizi blog')
  .version('0.5.0')

program
  .command('login')
  .description('Sign in to Blogizi in your browser (recommended)')
  .option('-p, --project <slug>', 'Set the active project slug')
  .option('--no-browser', 'Print the sign-in URL instead of opening a browser')
  .option('--api-url <url>', 'Blogizi URL (default: https://blogizi.com)')
  .action((options) => loginCommand(options))

program
  .command('logout')
  .description('Sign out and revoke this device’s Blogizi session')
  .action(logoutCommand)

program
  .command('status')
  .alias('whoami')
  .description('Show how the CLI is authenticated and which blogs it can reach')
  .action(statusCommand)

program
  .command('auth <apiKey>')
  .description('Authenticate with an account API key (alternative to blogizi login)')
  .option('-p, --project <slug>', 'Set the active project slug')
  .action((apiKey, options) => authCommand(apiKey, options))

program
  .command('use <projectSlug>')
  .description('Set the active project for draft/update/publish (account API keys)')
  .action(useCommand)

program
  .command('draft <file>')
  .description('Save a local .md file to your blog as a draft')
  .action(draftCommand)

program
  .command('update <file>')
  .description(
    'Update an existing post by slug (creates one if the slug is new)',
  )
  .action(updateCommand)

program
  .command('publish <file>')
  .description('Publish a local .md file to your blog')
  .action(publishCommand)

program
  .command('upload <file>')
  .description(
    'Upload a cover or inline content image for an existing post slug',
  )
  .option('-s, --slug <slug>', 'Post slug')
  .option('--post-id <id>', 'Post id (alternative to --slug)')
  .option('-t, --type <type>', 'cover or content (default: content)', 'content')
  .option('-a, --alt <text>', 'Alt text for the printed markdown snippet')
  .action((file, options) => uploadCommand(file, options))

program.parse()
