import type { Config, ParsedPost } from '../types.js'

export async function publishPost(
  config: Config,
  post: ParsedPost,
): Promise<{ success: boolean; url?: string; projectId?: string; error?: string }> {
  const url = `${config.apiUrl}/api/posts`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }

  if (config.projectSlug) {
    headers['X-Blogizi-Project'] = config.projectSlug
  }

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
      status: post.frontmatter.status,
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
  return {
    success: true,
    url: `https://${projectSlug}.app.blogizi.com/${slug}`,
    projectId,
  }
}
