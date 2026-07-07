#!/usr/bin/env node
import { Command } from 'commander'
import { authCommand } from './commands/auth.js'
import { draftCommand } from './commands/draft.js'
import { publishCommand } from './commands/publish.js'

const program = new Command()

program
  .name('blogizi')
  .description('AI agent that turns your codebase into SEO blog posts')
  .version('0.1.0')

program
  .command('auth <apiKey>')
  .description('Authenticate with your Blogizi project')
  .action(authCommand)

program
  .command('draft')
  .description('Draft a new blog post from your codebase')
  .requiredOption('-k, --keyword <keyword>', 'Target SEO keyword')
  .option('-a, --ai <provider>', 'AI provider: claude, codex, gemini', 'claude')
  .option('-o, --output <path>', 'Custom output path for .md file')
  .option('-p, --publish', 'Auto-publish after drafting', false)
  .action((options) => draftCommand(options))

program
  .command('publish <file>')
  .description('Publish a local .md file to your blog')
  .action(publishCommand)

program.parse()
