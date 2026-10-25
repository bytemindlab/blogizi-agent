export interface Config {
  /**
   * Bearer credential sent to the API. For `blogizi auth <key>` this is the
   * account API key; after `blogizi login` it is filled in at runtime with a
   * fresh OAuth access token (see requireAuthConfig).
   */
  apiKey: string
  apiUrl: string // default: https://blogizi.com
  /** Active project slug for CLI draft/publish when using an account API key */
  projectSlug?: string
  /** How this config authenticates. Missing = legacy API key config. */
  authMethod?: 'api_key' | 'oauth'
  /** OAuth (blogizi login): short-lived access token */
  accessToken?: string
  /** OAuth (blogizi login): rotating refresh token */
  refreshToken?: string
  /** OAuth: access token expiry, epoch milliseconds */
  accessTokenExpiresAt?: number
}

export interface PostFrontmatter {
  title: string
  description: string
  keyword: string
  slug: string
  status: 'draft' | 'published'
  date: string
  readingTime: number
  wordCount: number
  /** Absolute HTTPS cover URL, or set after CLI uploads a local coverImage. */
  coverImageUrl?: string
  /** Local relative path or HTTPS URL for the cover image. */
  coverImage?: string
  /** Per-post CTA override fields (optional). */
  ctaTitle?: string
  ctaSubtitle?: string
  ctaButtonLabel?: string
  ctaButtonUrl?: string
  /** Per-post sidebar CTA override fields (optional). */
  sidebarCtaTitle?: string
  sidebarCtaText?: string
  sidebarCtaBullets?: string[]
  sidebarCtaButtonLabel?: string
  sidebarCtaButtonUrl?: string
}

export interface ParsedPost {
  frontmatter: PostFrontmatter
  content: string
  raw: string
}
