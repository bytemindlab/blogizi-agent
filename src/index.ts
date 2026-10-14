#!/usr/bin/env node
import { Command } from 'commander'
import { authCommand } from './commands/auth.js'
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
  .command('auth <apiKey>')
  .description('Authenticate with your Blogizi account API key')
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
