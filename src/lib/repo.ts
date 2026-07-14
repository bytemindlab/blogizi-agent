import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

// Extensions worth reading for context
const SUPPORTED_EXTENSIONS = [
  'ts', 'tsx', 'js', 'jsx', 'go', 'py', 'rs',
  'md', 'mdx', 'json', 'yaml', 'yml', 'env.example'
]

// Default folders to always exclude
const DEFAULT_EXCLUDE = [
  'node_modules', '.next', '.git', 'dist', 'build',
  'coverage', '.vercel', 'vendor'
]

export async function readCodebase(
  rootDir: string,
  excludeFolders: string[] = []
): Promise<string> {
  const excluded = [...DEFAULT_EXCLUDE, ...excludeFolders]
  const pattern = `**/*.{${SUPPORTED_EXTENSIONS.join(',')}}`

  const files = await glob(pattern, {
    cwd: rootDir,
    ignore: excluded.map(f => `**/${f}/**`),
    absolute: true,
  })

  // Limit to 50 most relevant files to avoid token overflow
  const limited = files.slice(0, 50)

  let output = ''
  for (const file of limited) {
    try {
      const content = readFileSync(file, 'utf-8')
      const relativePath = file.replace(rootDir, '').replace(/^\//, '')
      output += `\n\n### File: ${relativePath}\n\`\`\`\n${content}\n\`\`\`\n`
    } catch {
      // skip unreadable files
    }
  }

  return output
}

export function readGitHistory(rootDir: string, limit = 50): string {
  try {
    const log = execSync(
      `git log --oneline --no-merges -${limit}`,
      { cwd: rootDir, encoding: 'utf-8' }
    )
    return log
  } catch {
    return 'No git history available.'
  }
}

export function readGitDiff(rootDir: string, limit = 10): string {
  try {
    const diff = execSync(
      `git log -${limit} -p --no-merges`,
      { cwd: rootDir, encoding: 'utf-8' }
    )
    return diff
  } catch {
    return ''
  }
}

// Architecture-level files only — no implementation details. Used by post
// types that reason about tech stack / decisions rather than code specifics
// (comparison, opinion), so the prompt stays small and fast.
const ARCHITECTURE_FILES = [
  'package.json',
  'package-lock.json',
  'go.mod',
  'go.sum',
  'Cargo.toml',
  'requirements.txt',
  'pyproject.toml',
  'README.md',
  'README.mdx',
  'ARCHITECTURE.md',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.env.example',
  'next.config.js',
  'next.config.ts',
  'vercel.json',
]

export async function readArchitectureContext(
  rootDir: string,
  _excludeFolders: string[] = []
): Promise<string> {
  let output = ''
  for (const filename of ARCHITECTURE_FILES) {
    const filePath = join(rootDir, filename)
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8')
        output += `\n\n### File: ${filename}\n\`\`\`\n${content}\n\`\`\`\n`
      } catch {
        // skip unreadable
      }
    }
  }
  return output || 'No architecture files found.'
}

// Git history with per-commit file/insertion/deletion stats — used by post
// types that need a fuller sense of what changed, not just commit subjects
// (story, changelog).
export function readDetailedGitHistory(rootDir: string, commitLimit = 30): string {
  try {
    const log = execSync(
      `git log --oneline --no-merges --stat -${commitLimit}`,
      { cwd: rootDir, encoding: 'utf-8' }
    )
    return log
  } catch {
    return 'No git history available.'
  }
}

// Commits from the last N weeks, grouped by ISO week — a building block for
// surfacing "what did I ship recently" summaries.
export function getCommitsByWeek(
  rootDir: string,
  weeks = 4
): { week: string; commits: string[] }[] {
  try {
    const since = new Date()
    since.setDate(since.getDate() - weeks * 7)
    const sinceStr = since.toISOString().split('T')[0]

    const log = execSync(
      `git log --oneline --no-merges --since="${sinceStr}" --format="%ad %s" --date=format:"%Y-W%V"`,
      { cwd: rootDir, encoding: 'utf-8' }
    )

    const byWeek: Record<string, string[]> = {}
    for (const line of log.split('\n').filter(Boolean)) {
      const [week, ...rest] = line.split(' ')
      const msg = rest.join(' ')
      if (!byWeek[week]) byWeek[week] = []
      byWeek[week].push(msg)
    }

    return Object.entries(byWeek)
      .map(([week, commits]) => ({ week, commits }))
      .sort((a, b) => b.week.localeCompare(a.week))
  } catch {
    return []
  }
}

// Recent commits with short hashes — the context suggest scans for post ideas.
export function getRecentCommitsSinceLastPost(rootDir: string, limit = 50): string {
  try {
    const log = execSync(
      `git log --oneline --no-merges -${limit} --format="%h %s"`,
      { cwd: rootDir, encoding: 'utf-8' }
    )
    return log
  } catch {
    return 'No git history available.'
  }
}
