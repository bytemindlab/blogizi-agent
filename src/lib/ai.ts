import { execSync } from 'child_process'

export type AiProvider = 'claude' | 'codex' | 'gemini'

export function runAi(prompt: string, provider: AiProvider = 'claude'): string {
  const commands: Record<AiProvider, string> = {
    claude: `claude -p`,
    codex: `codex -p`,
    gemini: `gemini -p`,
  }

  const cmd = commands[provider]
  if (!cmd) throw new Error(`Unknown AI provider: ${provider}`)

  try {
    // Pass prompt via stdin to avoid shell escaping issues
    const output = execSync(cmd, {
      input: prompt,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 120000, // 2 min timeout
    })
    return output.trim()
  } catch (err: any) {
    throw new Error(`AI command failed: ${err.message}`)
  }
}
