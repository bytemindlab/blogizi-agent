import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { requireConfig } from '../lib/config.js'
import { readCodebase, readGitHistory } from '../lib/repo.js'
import { buildDraftPrompt } from '../lib/prompt.js'
import { runAi } from '../lib/ai.js'
import { parsePost } from '../lib/parser.js'
import { publishPost } from '../lib/api.js'
import type { DraftOptions } from '../types.js'

export async function draftCommand(options: DraftOptions) {
  const config = requireConfig()
  const cwd = process.cwd()

  // Step 1: Read codebase
  const spinner = ora('Reading codebase...').start()
  const codebaseContext = await readCodebase(cwd)
  const gitHistory = readGitHistory(cwd)
  spinner.succeed('Codebase read')

  // Step 2: Build prompt
  const prompt = buildDraftPrompt(options.keyword, codebaseContext, gitHistory)

  // Step 3: Run AI
  spinner.start(`Drafting post with ${options.ai}...`)
  let raw: string
  try {
    raw = runAi(prompt, options.ai)
    spinner.succeed('Post drafted')
  } catch (err: any) {
    spinner.fail(`AI failed: ${err.message}`)
    process.exit(1)
  }

  // Step 4: Parse output
  const post = parsePost(raw)

  // Step 5: Save .md file locally
  const outputDir = join(cwd, 'blogizi-posts')
  mkdirSync(outputDir, { recursive: true })
  const outputPath = options.output || join(outputDir, `${post.frontmatter.slug}.md`)
  writeFileSync(outputPath, post.raw)
  console.log(chalk.green(`✓ Saved to ${outputPath}`))

  // Step 6: Push to API (as draft by default)
  spinner.start('Pushing to Blogizi...')
  const result = await publishPost(config, post)

  if (!result.success) {
    spinner.fail(`Failed to push: ${result.error}`)
    process.exit(1)
  }

  spinner.succeed('Post saved to dashboard')
  console.log(chalk.dim(`Edit it at https://blogizi.com/dashboard/projects/${result.projectId}`))

  // Step 7: Auto publish if flag set
  if (options.publish) {
    console.log(chalk.green(`✓ Published at ${result.url}`))
  } else {
    console.log(chalk.yellow('Post saved as draft. Publish from your dashboard when ready.'))
  }
}
