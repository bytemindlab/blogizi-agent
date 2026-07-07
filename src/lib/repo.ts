import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
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
