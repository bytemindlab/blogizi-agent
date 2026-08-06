export interface Config {
  apiKey: string
  apiUrl: string // default: https://blogizi.com
  /** Active project slug for CLI publish/upload when using an account API key */
  projectSlug?: string
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
}

export interface ParsedPost {
  frontmatter: PostFrontmatter
  content: string
  raw: string
}

export type PostType =
  | 'tutorial'      // technical, code-heavy (default)
  | 'story'         // narrative journey, git history driven
  | 'comparison'    // X vs Y, high search intent
  | 'changelog'     // release notes from git log
  | 'opinion'       // why I chose X, lessons learned
  | 'listicle'      // numbered list format

export interface DraftOptions {
  keyword: string
  type: PostType // defaults to 'tutorial'
  ai: 'claude' | 'codex' | 'gemini'
  output?: string // custom output path
  publish?: boolean // auto publish after draft
}

export interface PostSuggestion {
  title: string
  keyword: string
  type: PostType
  reason: string // why this was suggested (e.g. "8 commits last week")
  commits: string[] // relevant commit messages
}

export interface SuggestOptions {
  ai: 'claude' | 'codex' | 'gemini'
  limit: number // max suggestions, default 5
}
