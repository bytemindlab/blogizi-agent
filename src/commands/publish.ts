import { readFileSync } from 'fs'
import chalk from 'chalk'
import ora from 'ora'
import { requireAuthConfig } from '../lib/config.js'
import { parsePost } from '../lib/parser.js'
import { pushPostWithImages, withForcedStatus } from '../lib/pushPost.js'

export async function publishCommand(filePath: string) {
  const config = await requireAuthConfig()

  const raw = readFileSync(filePath, 'utf-8')
  const post = withForcedStatus(parsePost(raw), 'published')

  const spinner = ora('Publishing...').start()
  let result = await pushPostWithImages(config, post, filePath, {
    upsert: false,
    status: 'published',
  })

  if (
    !result.success &&
    /already taken|already exists|conflict/i.test(result.error || '')
  ) {
    result = await pushPostWithImages(config, post, filePath, {
      upsert: true,
      status: 'published',
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
  spinner.succeed(`Published at ${result.url}${imageNote}`)
  console.log(chalk.dim('Any pending schedule was cancelled.'))
}
