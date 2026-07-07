export function buildDraftPrompt(
  keyword: string,
  codebaseContext: string,
  gitHistory: string,
): string {
  return `You are a technical blog writer for an indie developer.
Your job is to write a high-quality, SEO-optimized blog post targeting the keyword: "${keyword}"

The post must be technically accurate, grounded in the actual codebase provided below.
Do not invent code or features that don't exist in the codebase.
Use real code snippets from the codebase where relevant.
Write in first person, as the developer who built this.
Tone: conversational, honest, technical but approachable.

## Codebase Context
${codebaseContext}

## Git History
${gitHistory}

## Output Format
Return ONLY a valid markdown file with YAML frontmatter. No explanation, no preamble, no markdown code fences around the whole output. Just the raw .md content starting with ---

The frontmatter must include exactly these fields:
---
title: "Your post title here"
description: "Meta description, 150-160 chars, includes the keyword"
keyword: "${keyword}"
slug: "url-friendly-slug-based-on-title"
status: "draft"
date: "${new Date().toISOString().split('T')[0]}"
readingTime: 0
wordCount: 0
---

After the frontmatter write the full blog post in markdown.
Minimum 800 words. Include:
- A compelling introduction that hooks the reader — start directly with it, do NOT open with a heading that repeats the title
- Clear headings (##, ###) for internal sections only — the title is already shown separately by the page, so no heading should just restate it
- Real code snippets from the codebase in fenced code blocks with language tags
- Practical takeaways
- A conclusion

Do not include readingTime or wordCount values — leave them as 0, they will be calculated automatically.`
}
