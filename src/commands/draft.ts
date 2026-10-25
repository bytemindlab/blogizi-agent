import { readFileSync } from 'fs'
import chalk from 'chalk'
import ora from 'ora'
import { requireAuthConfig } from '../lib/config.js'
import { parsePost } from '../lib/parser.js'
import { pushPostWithImages, withForcedStatus } from '../lib/pushPost.js'

export type DraftCommandOptions = {
  scheduledAt?: string
}

export async function draftCommand(
  filePath: string,
  options: DraftCommandOptions = {},
) {
  const config = await requireAuthConfig()

  const raw = readFileSync(filePath, 'utf-8')
  const post = withForcedStatus(parsePost(raw), 'draft')
  const scheduledAtOverride =
    options.scheduledAt !== undefined ? options.scheduledAt.trim() || null : undefined

  const spinner = ora('Saving draft...').start()
  // Prefer create; if slug exists, upsert so image rewrite can still land.
  let result = await pushPostWithImages(config, post, filePath, {
    upsert: false,
    status: 'draft',
    ...(scheduledAtOverride !== undefined
      ? { scheduledAt: scheduledAtOverride }
      : {}),
  })

  if (!result.success && /already taken|already exists|conflict/i.test(result.error || '')) {
    result = await pushPostWithImages(config, post, filePath, {
      upsert: true,
      status: 'draft',
      ...(scheduledAtOverride !== undefined
        ? { scheduledAt: scheduledAtOverride }
        : {}),
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
  const scheduleNote = result.scheduledAt
    ? ` · scheduled for ${result.scheduledAt}`
    : post.frontmatter.scheduledAt
      ? ` · scheduled for ${post.frontmatter.scheduledAt}`
      : ''
  spinner.succeed(`Saved as draft${scheduleNote}${imageNote}`)
  console.log(
    chalk.dim(
      `Edit it at https://blogizi.com/dashboard/projects/${result.projectId}`,
    ),
  )
}
