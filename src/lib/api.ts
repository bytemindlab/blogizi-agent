import { readFileSync } from 'fs'
import { basename } from 'path'
import type { Config, ParsedPost, PostFrontmatter } from '../types.js'

export type PublishPostOptions = {
  /** Match Obsidian: update by slug when the post already exists. */
  upsert?: boolean
  /**
   * When set, overrides frontmatter status in the request body.
   * When `null`, omit status so the server keeps the existing post's status on update.
   */
  status?: PostFrontmatter['status'] | null
}

export type PublishPostResult = {
  success: boolean
  url?: string
  projectId?: string
  postId?: string
  created?: boolean
  error?: string
}

export type UploadImageOptions = {
  filePath: string
  type: 'cover' | 'content'
  postId?: string
  postSlug?: string
  projectId?: string
  alt?: string
}

export type UploadImageResult = {
  success: boolean
  url?: string
  markdown?: string
  error?: string
}

export async function publishPost(
  config: Config,
  post: ParsedPost,
  options: PublishPostOptions = {},
): Promise<PublishPostResult> {
  const url = `${config.apiUrl}/api/posts`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }

  if (config.projectSlug) {
    headers['X-Blogizi-Project'] = config.projectSlug
  }

  const status =
    options.status === null
      ? undefined
      : (options.status ?? post.frontmatter.status)

  const {
    ctaTitle,
    ctaSubtitle,
    ctaButtonLabel,
    ctaButtonUrl,
    coverImageUrl,
  } = post.frontmatter

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: post.frontmatter.title,
      slug: post.frontmatter.slug,
      description: post.frontmatter.description,
      keyword: post.frontmatter.keyword,
      content: post.content,
      frontmatter: post.frontmatter,
      ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
      ...(ctaTitle !== undefined ? { ctaTitle } : {}),
      ...(ctaSubtitle !== undefined ? { ctaSubtitle } : {}),
      ...(ctaButtonLabel !== undefined ? { ctaButtonLabel } : {}),
      ...(ctaButtonUrl !== undefined ? { ctaButtonUrl } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(options.upsert ? { upsert: true } : {}),
      ...(config.projectSlug ? { projectSlug: config.projectSlug } : {}),
    }),
  })

  const json = await res.json()

  if (!res.ok) {
    return { success: false, error: json.error || 'Unknown error' }
  }

  const slug = json.data?.slug
  const projectSlug = json.project?.slug
  const projectId = json.project?.id
  const postId = json.data?._id || json.data?.id
  return {
    success: true,
    url: `https://${projectSlug}.app.blogizi.com/${slug}`,
    projectId,
    postId: postId ? String(postId) : undefined,
    created: json.created === true,
  }
}

export async function uploadImage(
  config: Config,
  options: UploadImageOptions,
): Promise<UploadImageResult> {
  const url = `${config.apiUrl}/api/upload`
  const bytes = readFileSync(options.filePath)
  const filename = basename(options.filePath)

  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(bytes)]), filename)
  form.append('type', options.type)
  if (options.projectId) form.append('projectId', options.projectId)
  else if (config.projectSlug) form.append('projectSlug', config.projectSlug)
  if (options.postId) form.append('postId', options.postId)
  if (options.postSlug) form.append('postSlug', options.postSlug)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
  }
  if (config.projectSlug) {
    headers['X-Blogizi-Project'] = config.projectSlug
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: form,
  })

  const json = await res.json()
  if (!res.ok) {
    return { success: false, error: json.error || 'Upload failed' }
  }

  const hostedUrl = json.data?.url as string | undefined
  if (!hostedUrl) {
    return { success: false, error: 'Upload succeeded but no URL returned' }
  }

  const markdown =
    options.type === 'content'
      ? (json.data?.markdown as string | undefined) ||
        `![${options.alt || ''}](${hostedUrl})`
      : undefined

  return { success: true, url: hostedUrl, markdown }
}
