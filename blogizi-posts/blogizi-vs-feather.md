---
title: 'Blogizi vs Feather: Which Blogging Tool Actually Fits a Developer''s Workflow?'
description: >-
  Comparing Blogizi and Feather for developer blogging — two very different
  approaches to publishing technical content from your codebase.
keyword: blogizi vs feather
slug: blogizi-vs-feather
status: draft
date: '2026-07-07'
readingTime: 5
wordCount: 905
---

## Blogizi vs Feather: Which Blogging Tool Actually Fits a Developer's Workflow?

I've been building Blogizi for a while now, and the question I keep getting is some variation of: "Why not just use Feather?" It's a fair question. Feather is polished, it works, and a lot of developers use it. So let me give you an honest answer — not a marketing pitch.

These are two fundamentally different tools solving two different problems. Once you see that distinction clearly, the choice becomes obvious for your situation.

---

## What Feather Is (and What It's Good At)

Feather is a Notion-to-blog publishing platform. You write your posts in Notion, connect your Feather account, and it generates a clean, SEO-friendly blog from your Notion pages. No server to manage, no markdown to wrangle, no deployment pipeline. You literally just write in Notion.

That's genuinely impressive for what it is. If you have a team of writers who live in Notion, or if you're a developer who just wants to get words on the internet without thinking about infrastructure, Feather is a great option. The UX is clean and the blogs it produces look professional.

But here's the thing: Feather is a *publishing* tool. You still have to write the content. That's the step it doesn't help you with.

---

## What Blogizi Actually Does

Blogizi is something different. It's an AI agent CLI that reads your actual codebase and generates technically accurate, SEO-optimized blog posts from it.

Here's what happens when you run it:

```bash
blogizi draft --keyword "go chi middleware"
```

The CLI does the following, in order:

1. Reads your local codebase (up to 50 files across supported extensions)
2. Pulls your recent git history
3. Builds a context-aware prompt from all of that
4. Shells out to your local AI CLI (`claude -p` by default)
5. Parses the markdown output
6. Saves a `.md` file locally in `./blogizi-posts/`
7. Pushes it to your Blogizi dashboard via the API

The codebase reading step is where Blogizi earns its keep. Here's the actual implementation from `src/lib/repo.ts`:

```typescript
const SUPPORTED_EXTENSIONS = [
  'ts', 'tsx', 'js', 'jsx', 'go', 'py', 'rs',
  'md', 'mdx', 'json', 'yaml', 'yml', 'env.example'
]

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
```

It also reads git history to understand what you've been working on:

```typescript
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
```

That context goes into the AI prompt. The resulting post isn't generic — it references your actual functions, your actual architecture decisions, your actual code. That's the core bet I'm making with Blogizi: the best technical content comes from the code itself.

---

## The AI Layer

Blogizi ships with support for three AI providers. You pick the one you already have set up locally:

```bash
blogizi draft --keyword "x" --ai claude   # default
blogizi draft --keyword "x" --ai codex
blogizi draft --keyword "x" --ai gemini
```

Under the hood, the AI layer is deliberately simple. It passes your prompt to whichever CLI you chose via stdin:

```typescript
export function runAi(prompt: string, provider: AiProvider = 'claude'): string {
  const commands: Record<AiProvider, string> = {
    claude: `claude -p`,
    codex: `codex -p`,
    gemini: `gemini -p`,
  }

  const cmd = commands[provider]

  const output = execSync(cmd, {
    input: prompt,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024, // 10MB
    timeout: 120000, // 2 min timeout
  })
  return output.trim()
}
```

No proprietary API keys, no model-specific SDK integrations. If you have `claude` installed and authenticated on your machine, Blogizi uses it. This also means you can swap models whenever you want — just change the `--ai` flag.

---

## The Output: Structured Markdown You Actually Own

Every post Blogizi generates lands in `./blogizi-posts/` as a plain `.md` file with YAML frontmatter. The frontmatter carries all the metadata the platform needs:

```typescript
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
```

Reading time and word count are calculated from the content automatically — the AI doesn't need to estimate them:

```typescript
const wordCount = content
  .replace(/```[\s\S]*?```/g, '')
  .replace(/[#*`_~\[\]]/g, '')
  .split(/\s+/)
  .filter(Boolean).length

const readingTime = Math.ceil(wordCount / 200)
```

You keep local copies of everything. If Blogizi disappeared tomorrow, you'd have all your posts as readable markdown files in your repo. That's intentional.

---

## Head-to-Head: Where Each Tool Wins

| | Blogizi | Feather |
|---|---|---|
| Writing experience | AI writes from your codebase | You write in Notion |
| Technical accuracy | Grounded in actual code | Up to you |
| Setup | `npm install -g blogizi` + auth | Notion + DNS config |
| Content ownership | Local `.md` files | Notion pages |
| AI provider | Claude, Codex, or Gemini (your choice) | None (you write it) |
| Best for | Developers who want to publish about their code | Developers who already write in Notion |

---

## The Publish Flow

When you're ready to push, you have two paths:

**Draft first, publish later:**
```bash
blogizi draft --keyword "go chi middleware"
# Review the file in ./blogizi-posts/
blogizi publish ./blogizi-posts/go-chi-middleware.md
```

**Draft and publish in one shot:**
```bash
blogizi draft --keyword "go chi middleware" --publish
```

The `--publish` flag sets the post status directly to `published` before pushing to the API. Without it, everything lands in your dashboard as a draft, which is the default I recommend — always review before you go live.

---

## Practical Takeaways

**Use Feather if:**
- Your team writes in Notion and wants a zero-config blog output
- You want a no-code publishing workflow
- The writing itself is the part you enjoy, and you just want easy publishing

**Use Blogizi if:**
- You're an indie developer with a codebase you want to write about
- You ship things but rarely have time to blog about them
- You want technically accurate posts grounded in your actual code, not generic AI output
- You prefer CLI tools over web dashboards for your content workflow

---

## Conclusion

Feather and Blogizi aren't really competing for the same user. Feather is a publishing layer on top of Notion. Blogizi is a content-generation agent that reads your code.

The real gap Blogizi fills is the one between "I built something interesting" and "I wrote a post about it." Most developers skip that gap entirely — not because they don't want to write, but because translating code into prose takes a different kind of energy than shipping features.

That's the problem I built Blogizi to solve. Whether it solves yours depends on whether your bottleneck is the writing or the publishing.
