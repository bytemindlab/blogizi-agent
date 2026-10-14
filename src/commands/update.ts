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

export async function updateCommand(filePath: string) {
  const config = await requireAuthConfig()

  const raw = readFileSync(filePath, 'utf-8')
  const post = parsePost(raw)
  const explicitStatus = hasExplicitStatus(raw)

  const spinner = ora('Updating post...').start()
  const result = await pushPostWithImages(config, post, filePath, {
    upsert: true,
    // Keep the live/draft status on the server unless the file sets it.
    status: explicitStatus ? post.frontmatter.status : null,
  })

  if (!result.success) {
    spinner.fail(`Failed: ${result.error}`)
    process.exit(1)
  }

  const imageNote =
    result.imagesUploaded && result.imagesUploaded > 0
      ? ` · ${result.imagesUploaded} image(s) uploaded`
      : ''

  if (result.created) {
    spinner.succeed(
      `No existing post with slug "${post.frontmatter.slug}" — created a new one${imageNote}`,
    )
    if (result.url) {
      console.log(chalk.dim(result.url))
    }
    return
  }

  spinner.succeed(`Updated post "${post.frontmatter.slug}"${imageNote}`)
  if (result.url) {
    console.log(chalk.dim(result.url))
  }
}
