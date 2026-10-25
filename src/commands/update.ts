import { readFileSync } from 'fs'
import matter from 'gray-matter'
import chalk from 'chalk'
import ora from 'ora'
import { requireAuthConfig } from '../lib/config.js'
import { parsePost } from '../lib/parser.js'
import { pushPostWithImages } from '../lib/pushPost.js'

function hasExplicitStatus(raw: string): boolean {
  const { data } = matter(raw)
  return data.status === 'draft' || data.status === 'published'
}

export type UpdateCommandOptions = {
  scheduledAt?: string
  /** When true, send scheduledAt: null to clear a schedule. */
  unschedule?: boolean
}

export async function updateCommand(
  filePath: string,
  options: UpdateCommandOptions = {},
) {
  const config = await requireAuthConfig()

  const raw = readFileSync(filePath, 'utf-8')
  const post = parsePost(raw)
  const explicitStatus = hasExplicitStatus(raw)

  let scheduledAtOverride: string | null | undefined
  if (options.unschedule) {
    scheduledAtOverride = null
  } else if (options.scheduledAt !== undefined) {
    scheduledAtOverride = options.scheduledAt.trim() || null
  }

  const spinner = ora('Updating post...').start()
  const result = await pushPostWithImages(config, post, filePath, {
    upsert: true,
    // Keep the live/draft status on the server unless the file sets it.
    status: explicitStatus ? post.frontmatter.status : null,
    ...(scheduledAtOverride !== undefined
      ? { scheduledAt: scheduledAtOverride }
      : {}),
  })

  if (!result.success) {
    spinner.fail(`Failed: ${result.error}`)
    process.exit(1)
  }

  const imageNote =
    result.imagesUploaded && result.imagesUploaded > 0
      ? ` · ${result.imagesUploaded} image(s) uploaded`
      : ''

  const scheduleNote =
    result.scheduledAt
      ? ` · scheduled for ${result.scheduledAt}`
      : options.unschedule || scheduledAtOverride === null
        ? ' · schedule cleared'
        : ''

  if (result.created) {
    spinner.succeed(
      `No existing post with slug "${post.frontmatter.slug}" — created a new one${scheduleNote}${imageNote}`,
    )
    if (result.url) {
      console.log(chalk.dim(result.url))
    }
    return
  }

  spinner.succeed(
    `Updated post "${post.frontmatter.slug}"${scheduleNote}${imageNote}`,
  )
  if (result.url) {
    console.log(chalk.dim(result.url))
  }
}
