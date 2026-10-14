import { readFileSync, existsSync } from 'fs'
import { dirname, isAbsolute, resolve } from 'path'
import type { Config, ParsedPost } from '../types.js'
import { uploadImage } from './api.js'

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

function isRemoteOrData(url: string): boolean {
  return /^(https?:|data:|mailto:)/i.test(url) || url.startsWith('#')
}

function resolveLocalPath(mdFilePath: string, imagePath: string): string {
  const cleaned = imagePath.replace(/^<|>$/g, '').trim()
  if (isAbsolute(cleaned)) return cleaned
  return resolve(dirname(mdFilePath), cleaned)
}

export type PreparedImages = {
  post: ParsedPost
  uploadedCount: number
  rewrittenLocalFile: boolean
}

/**
 * Upload relative markdown images + optional local coverImage, rewrite URLs
 * to hosted media URLs. Post must already exist (postId required).
 */
export async function preparePostImages(
  config: Config,
  post: ParsedPost,
  mdFilePath: string,
  ids: { postId: string; projectId: string },
): Promise<PreparedImages> {
  let content = post.content
  let uploadedCount = 0
  const replacements: Array<{ from: string; to: string }> = []

  const matches = [...content.matchAll(new RegExp(MARKDOWN_IMAGE_RE.source, 'g'))]
  for (const match of matches) {
    const full = match[0]
    const alt = match[1] ?? ''
    const src = match[2]?.trim()
    if (!src || isRemoteOrData(src)) continue

    const localPath = resolveLocalPath(mdFilePath, src)
    if (!existsSync(localPath)) {
      throw new Error(`Local image not found: ${src} (resolved ${localPath})`)
    }

    const result = await uploadImage(config, {
      filePath: localPath,
      type: 'content',
      postId: ids.postId,
      projectId: ids.projectId,
      alt,
    })
    if (!result.success || !result.url) {
      throw new Error(result.error || `Failed to upload ${src}`)
    }

    const next = `![${alt}](${result.url})`
    replacements.push({ from: full, to: next })
    uploadedCount += 1
  }

  for (const { from, to } of replacements) {
    content = content.replace(from, to)
  }

  let coverImageUrl = post.frontmatter.coverImageUrl
  const coverLocal = post.frontmatter.coverImage
  if (coverLocal && !isRemoteOrData(coverLocal)) {
    const localPath = resolveLocalPath(mdFilePath, coverLocal)
    if (!existsSync(localPath)) {
      throw new Error(
        `Local cover image not found: ${coverLocal} (resolved ${localPath})`,
      )
    }
    const result = await uploadImage(config, {
      filePath: localPath,
      type: 'cover',
      postId: ids.postId,
      projectId: ids.projectId,
    })
    if (!result.success || !result.url) {
      throw new Error(result.error || `Failed to upload cover ${coverLocal}`)
    }
    coverImageUrl = result.url
    uploadedCount += 1
  }

  return {
    post: {
      ...post,
      content,
      frontmatter: {
        ...post.frontmatter,
        ...(coverImageUrl ? { coverImageUrl } : {}),
        // Don't send local path to the API after upload
        coverImage: undefined,
      },
    },
    uploadedCount,
    rewrittenLocalFile: false,
  }
}

export function hasLocalImages(post: ParsedPost, mdFilePath: string): boolean {
  if (post.frontmatter.coverImage && !isRemoteOrData(post.frontmatter.coverImage)) {
    return existsSync(resolveLocalPath(mdFilePath, post.frontmatter.coverImage))
  }

  for (const match of post.content.matchAll(
    new RegExp(MARKDOWN_IMAGE_RE.source, 'g'),
  )) {
    const src = match[2]?.trim()
    if (src && !isRemoteOrData(src)) {
      if (existsSync(resolveLocalPath(mdFilePath, src))) return true
    }
  }
  return false
}

/** Unused helper kept for tests/tools that only need bytes. */
export function readImageBuffer(filePath: string): Buffer {
  return readFileSync(filePath)
}
