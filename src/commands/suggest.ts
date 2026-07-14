import chalk from 'chalk'
import ora from 'ora'
import { requireConfig } from '../lib/config.js'
import { getRecentCommitsSinceLastPost, readArchitectureContext } from '../lib/repo.js'
import { buildSuggestPrompt } from '../lib/prompt.js'
import { runAiJson } from '../lib/ai.js'
import type { PostSuggestion, SuggestOptions } from '../types.js'

export async function suggestCommand(options: SuggestOptions) {
  // requireConfig() ensures the user is authenticated; suggest itself is a
  // local, read-only command and doesn't call the Blogizi API.
  requireConfig()
  const cwd = process.cwd()

  const spinner = ora('Scanning git history...').start()
  const recentCommits = getRecentCommitsSinceLastPost(cwd)
  const architectureContext = await readArchitectureContext(cwd)
  spinner.succeed('Git history scanned')

  // NOTE: the config stores only { apiKey, apiUrl } — there is no stored
  // projectId (by design: an API key is unique per project) and `auth`
  // never calls the API, so the CLI has no way to fetch this project's
  // existing post titles to dedupe suggestions against. Suggestions below
  // are based purely on local git/architecture context, not on what's
  // already been published.
  const prompt = buildSuggestPrompt(recentCommits, architectureContext, options.limit)

  spinner.start(`Generating suggestions with ${options.ai}...`)
  let suggestions: PostSuggestion[]
  try {
    suggestions = runAiJson<PostSuggestion[]>(prompt, options.ai)
    spinner.succeed('Suggestions ready')
  } catch (err: any) {
    spinner.fail(`AI failed: ${err.message}`)
    process.exit(1)
  }

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    console.log(chalk.yellow('No suggestions found — try again after making more commits.'))
    return
  }

  console.log('')
  suggestions.slice(0, options.limit).forEach((s, i) => {
    console.log(chalk.bold(`${i + 1}. ${s.title}`))
    console.log(chalk.dim(`   type: ${s.type}  keyword: "${s.keyword}"`))
    console.log(chalk.dim(`   why: ${s.reason}`))
    if (s.commits?.length) {
      console.log(chalk.dim(`   commits: ${s.commits.join(', ')}`))
    }
    console.log('')
  })

  console.log(chalk.green('Draft one with:'))
  console.log(chalk.dim(`  blogizi draft --keyword "${suggestions[0].keyword}" --type ${suggestions[0].type}`))
}
