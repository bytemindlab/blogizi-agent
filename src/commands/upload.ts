import { basename, resolve } from 'path'
import { existsSync } from 'fs'
import chalk from 'chalk'
import ora from 'ora'
import { requireConfig } from '../lib/config.js'
import { uploadImage } from '../lib/api.js'

type UploadOptions = {
  slug?: string
  type?: string
  alt?: string
  postId?: string
}

export async function uploadCommand(filePath: string, options: UploadOptions) {
  const config = requireConfig()
  const absolute = resolve(filePath)

  if (!existsSync(absolute)) {
    console.error(chalk.red(`File not found: ${absolute}`))
    process.exit(1)
  }

  const type = options.type === 'cover' ? 'cover' : 'content'
  const slug = options.slug?.trim()
  const postId = options.postId?.trim()

  if (!slug && !postId) {
    console.error(
      chalk.red('Pass --slug <post-slug> (or --post-id) for an existing post'),
    )
    process.exit(1)
  }

  const spinner = ora(
    `Uploading ${basename(absolute)} as ${type}…`,
  ).start()

  const result = await uploadImage(config, {
    filePath: absolute,
    type,
    postSlug: slug,
    postId,
    alt: options.alt,
  })

  if (!result.success) {
    spinner.fail(`Failed: ${result.error}`)
    process.exit(1)
  }

  spinner.succeed(
    type === 'cover' ? 'Cover image uploaded and saved on the post' : 'Image uploaded',
  )
  console.log(chalk.green(result.url))
  if (result.markdown) {
    console.log(chalk.dim('Markdown:'))
    console.log(result.markdown)
  }
}
