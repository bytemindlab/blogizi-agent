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

// AI providers frequently wrap JSON in ```json fences despite instructions
// not to — strip those defensively before parsing.
function stripCodeFences(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return fenced ? fenced[1].trim() : trimmed
}

export function runAiJson<T>(prompt: string, provider: AiProvider = 'claude'): T {
  const raw = runAi(prompt, provider)
  const cleaned = stripCodeFences(raw)

  try {
    return JSON.parse(cleaned) as T
  } catch (err: any) {
    const preview = cleaned.length > 500 ? `${cleaned.slice(0, 500)}...` : cleaned
    throw new Error(`AI returned invalid JSON: ${err.message}\n\nRaw output:\n${preview}`)
  }
}
