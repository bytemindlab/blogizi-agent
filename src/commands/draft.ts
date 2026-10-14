import { readFileSync } from 'fs'
import chalk from 'chalk'
import ora from 'ora'
import { requireConfig } from '../lib/config.js'
import { parsePost } from '../lib/parser.js'
import { pushPostWithImages, withForcedStatus } from '../lib/pushPost.js'

export async function draftCommand(filePath: string) {
  const config = requireConfig()

  const raw = readFileSync(filePath, 'utf-8')
  const post = withForcedStatus(parsePost(raw), 'draft')

  const spinner = ora('Saving draft...').start()
  // Prefer create; if slug exists, upsert so image rewrite can still land.
  let result = await pushPostWithImages(config, post, filePath, {
    upsert: false,
    status: 'draft',
  })

  if (!result.success && /already taken|already exists|conflict/i.test(result.error || '')) {
    result = await pushPostWithImages(config, post, filePath, {
      upsert: true,
      status: 'draft',
    })
  }

  if (!result.success) {
    spinner.fail(`Failed: ${result.error}`)
    process.exit(1)
  }

  const imageNote =
    result.imagesUploaded && result.imagesUploaded > 0
      ? ` · ${result.imagesUploaded} image(s) uploaded`
      : ''
  spinner.succeed(`Saved as draft${imageNote}`)
  console.log(
    chalk.dim(
      `Edit it at https://blogizi.com/dashboard/projects/${result.projectId}`,
    ),
  )
}
