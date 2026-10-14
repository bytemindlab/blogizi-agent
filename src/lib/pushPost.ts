import type { Config, ParsedPost, PostFrontmatter } from '../types.js'
import { publishPost, type PublishPostOptions, type PublishPostResult } from './api.js'
import { hasLocalImages, preparePostImages } from './images.js'

/**
 * Push a post, uploading any relative local images afterward and re-upserting
 * with hosted URLs when needed.
 */
export async function pushPostWithImages(
  config: Config,
  post: ParsedPost,
  mdFilePath: string,
  options: PublishPostOptions = {},
): Promise<PublishPostResult & { imagesUploaded?: number }> {
  // First push creates/updates the post so we have a postId for uploads.
  const initial = await publishPost(config, post, {
    ...options,
    upsert: options.upsert ?? true,
  })

  if (!initial.success) {
    // Retry without forced upsert when creating a brand-new draft via `draft`
    // (draft command historically used create-only). Caller may pass upsert:false.
    if (options.upsert === false) {
      return initial
    }
    return initial
  }

  if (!initial.postId || !initial.projectId) {
    return initial
  }

  if (!hasLocalImages(post, mdFilePath)) {
    // Still send absolute coverImageUrl if present on first push — already done.
    return { ...initial, imagesUploaded: 0 }
  }

  const prepared = await preparePostImages(config, post, mdFilePath, {
    postId: initial.postId,
    projectId: initial.projectId,
  })

  if (prepared.uploadedCount === 0) {
    return { ...initial, imagesUploaded: 0 }
  }

  const second = await publishPost(config, prepared.post, {
    ...options,
    upsert: true,
    // Keep status behavior from the first push
    status:
      options.status === null
        ? null
        : (options.status ?? prepared.post.frontmatter.status),
  })

  if (!second.success) {
    return {
      success: false,
      error: `Images uploaded but post update failed: ${second.error}`,
    }
  }

  return { ...second, imagesUploaded: prepared.uploadedCount }
}

export function withForcedStatus(
  post: ParsedPost,
  status: PostFrontmatter['status'],
): ParsedPost {
  return {
    ...post,
    frontmatter: { ...post.frontmatter, status },
  }
}
