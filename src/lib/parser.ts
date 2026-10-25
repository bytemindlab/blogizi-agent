import matter from 'gray-matter'
import type { ParsedPost, PostFrontmatter } from '../types.js'

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** YAML list of strings, or one string with a bullet per line. */
function optionalStringList(value: unknown): string[] | undefined {
  const items =
    typeof value === 'string'
      ? value.split('\n')
      : Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : undefined
  if (!items) return undefined
  const cleaned = items.map((item) => item.trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned : undefined
}

/**
 * Parse frontmatter scheduledAt.
 * - Key absent → undefined (omit on API; keep existing on upsert)
 * - null / empty / ~ → null (clear schedule)
 * - Date / string → ISO or trimmed string for the server
 */
function optionalScheduledAt(
  data: Record<string, unknown>,
): string | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(data, 'scheduledAt')) {
    return undefined
  }
  const value = data.scheduledAt
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // YAML may parse unix seconds or ms; prefer seconds if small.
    const ms = value < 1e12 ? value * 1000 : value
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

// AI providers frequently restate the title as the first heading, even when
// told not to — the page already shows the title separately, so strip it
// here deterministically instead of relying on the prompt being followed.
function stripDuplicateTitleHeading(content: string, title: string): string {
  const trimmed = content.replace(/^\s+/, '')
  const match = trimmed.match(/^(#{1,6})[ \t]+(.+?)[ \t]*\n+/)
  if (!match) return content

  const [fullMatch, , headingText] = match
  if (normalize(headingText) !== normalize(title)) return content

  return trimmed.slice(fullMatch.length)
}

export function parsePost(raw: string): ParsedPost {
  const { data, content: rawContent } = matter(raw)

  const title = data.title || 'Untitled'
  const content = stripDuplicateTitleHeading(rawContent, title)

  const wordCount = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*`_~\[\]]/g, '')
    .split(/\s+/)
    .filter(Boolean).length

  const readingTime = Math.ceil(wordCount / 200)

  const ctaTitle = optionalString(data.ctaTitle)
  const ctaSubtitle = optionalString(data.ctaSubtitle)
  const ctaButtonLabel = optionalString(data.ctaButtonLabel)
  const ctaButtonUrl = optionalString(data.ctaButtonUrl)
  const sidebarCtaTitle = optionalString(data.sidebarCtaTitle)
  const sidebarCtaText = optionalString(data.sidebarCtaText)
  const sidebarCtaBullets = optionalStringList(data.sidebarCtaBullets)
  const sidebarCtaButtonLabel = optionalString(data.sidebarCtaButtonLabel)
  const sidebarCtaButtonUrl = optionalString(data.sidebarCtaButtonUrl)
  const coverImageUrl = optionalString(data.coverImageUrl)
  const coverImage = optionalString(data.coverImage)
  const scheduledAt = optionalScheduledAt(data as Record<string, unknown>)

  const frontmatter: PostFrontmatter = {
    title,
    description: data.description || '',
    keyword: data.keyword || '',
    slug: data.slug || 'untitled',
    status: data.status || 'draft',
    date: data.date || new Date().toISOString().split('T')[0],
    readingTime,
    wordCount,
    ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
    ...(coverImage !== undefined ? { coverImage } : {}),
    ...(ctaTitle !== undefined ? { ctaTitle } : {}),
    ...(ctaSubtitle !== undefined ? { ctaSubtitle } : {}),
    ...(ctaButtonLabel !== undefined ? { ctaButtonLabel } : {}),
    ...(ctaButtonUrl !== undefined ? { ctaButtonUrl } : {}),
    ...(sidebarCtaTitle !== undefined ? { sidebarCtaTitle } : {}),
    ...(sidebarCtaText !== undefined ? { sidebarCtaText } : {}),
    ...(sidebarCtaBullets !== undefined ? { sidebarCtaBullets } : {}),
    ...(sidebarCtaButtonLabel !== undefined ? { sidebarCtaButtonLabel } : {}),
    ...(sidebarCtaButtonUrl !== undefined ? { sidebarCtaButtonUrl } : {}),
    ...(scheduledAt !== undefined ? { scheduledAt } : {}),
  }

  return { frontmatter, content, raw: matter.stringify(content, { ...frontmatter }) }
}
