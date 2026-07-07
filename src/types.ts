export interface Config {
  apiKey: string
  apiUrl: string // default: https://blogizi.com
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

export interface DraftOptions {
  keyword: string
  ai: 'claude' | 'codex' | 'gemini'
  output?: string // custom output path
  publish?: boolean // auto publish after draft
}
