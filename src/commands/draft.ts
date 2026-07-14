import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { requireConfig } from '../lib/config.js'
import {
  readCodebase,
  readGitHistory,
  readArchitectureContext,
  readDetailedGitHistory,
} from '../lib/repo.js'
import {
  buildTutorialPrompt,
  buildStoryPrompt,
  buildComparisonPrompt,
  buildChangelogPrompt,
  buildOpinionPrompt,
  buildListiclePrompt,
} from '../lib/prompt.js'
import { runAi } from '../lib/ai.js'
import { parsePost } from '../lib/parser.js'
import { publishPost } from '../lib/api.js'
import type { DraftOptions, PostType } from '../types.js'

interface DraftContext {
  codebaseContext?: string
  gitHistory?: string
  detailedGitHistory?: string
  architectureContext?: string
}

async function buildContext(type: PostType, cwd: string): Promise<DraftContext> {
  switch (type) {
    case 'story':
      return {
        detailedGitHistory: readDetailedGitHistory(cwd),
        architectureContext: await readArchitectureContext(cwd),
      }
    case 'comparison':
    case 'opinion':
      return {
        architectureContext: await readArchitectureContext(cwd),
        gitHistory: readGitHistory(cwd),
      }
    case 'changelog':
      return { detailedGitHistory: readDetailedGitHistory(cwd) }
    case 'listicle':
      return { codebaseContext: await readCodebase(cwd) }
    case 'tutorial':
    default:
      return {
        codebaseContext: await readCodebase(cwd),
        gitHistory: readGitHistory(cwd),
      }
  }
}

function buildPrompt(type: PostType, keyword: string, context: DraftContext): string {
  switch (type) {
    case 'story':
      return buildStoryPrompt(keyword, context.detailedGitHistory ?? '', context.architectureContext ?? '')
    case 'comparison':
      return buildComparisonPrompt(keyword, context.architectureContext ?? '')
    case 'changelog':
      return buildChangelogPrompt(keyword, context.detailedGitHistory ?? '')
    case 'opinion':
      return buildOpinionPrompt(keyword, context.architectureContext ?? '', context.gitHistory ?? '')
    case 'listicle':
      return buildListiclePrompt(keyword, context.codebaseContext ?? '')
    case 'tutorial':
    default:
      return buildTutorialPrompt(keyword, context.codebaseContext ?? '', context.gitHistory ?? '')
  }
}

export async function draftCommand(options: DraftOptions) {
  const config = requireConfig()
  const cwd = process.cwd()
  const type = options.type || 'tutorial'

  // Step 1: Read codebase context for the chosen post type
  const spinner = ora('Reading codebase...').start()
  const context = await buildContext(type, cwd)
  spinner.succeed('Codebase read')

  // Step 2: Build prompt for the chosen post type
  const prompt = buildPrompt(type, options.keyword, context)

  // Step 3: Run AI
  spinner.start(`Drafting ${type} post with ${options.ai}...`)
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
