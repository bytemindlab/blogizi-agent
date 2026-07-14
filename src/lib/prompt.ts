function outputFormatInstructions(keyword: string, extraBodyNotes: string[] = []): string {
  const bodyNotes = [
    'A compelling introduction that hooks the reader — start directly with it, do NOT open with a heading that repeats the title',
    'Clear headings (##, ###) for internal sections only — the title is already shown separately by the page, so no heading should just restate it',
    ...extraBodyNotes,
    'Practical takeaways',
    'A conclusion',
  ]

  return `## Output Format
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
${bodyNotes.map((note) => `- ${note}`).join('\n')}

Do not include readingTime or wordCount values — leave them as 0, they will be calculated automatically.`
}

export function buildTutorialPrompt(
  keyword: string,
  codebaseContext: string,
  gitHistory: string,
): string {
  return `You are a technical blog writer for an indie developer.
Your job is to write a high-quality, SEO-optimized tutorial blog post targeting the keyword: "${keyword}"

The post must be technically accurate, grounded in the actual codebase provided below.
Do not invent code or features that don't exist in the codebase.
Use real code snippets from the codebase where relevant.
Write in first person, as the developer who built this.
Tone: conversational, honest, technical but approachable.

## Codebase Context
${codebaseContext}

## Git History
${gitHistory}

${outputFormatInstructions(keyword, ['Real code snippets from the codebase in fenced code blocks with language tags'])}`
}

export function buildStoryPrompt(
  keyword: string,
  detailedGitHistory: string,
  architectureContext: string,
): string {
  return `You are a technical blog writer for an indie developer.
Your job is to write a narrative, journey-style blog post targeting the keyword: "${keyword}"

This is a "how I built it" story, not a tutorial. Ground it in the real sequence of changes
below — use the git history to reconstruct the actual arc: what problem kicked things off,
what decisions were made along the way, what broke, what got rewritten, and where things ended up.
Do not invent events that aren't reflected in the history.
Write in first person, as the developer who lived through this.
Tone: honest, reflective, conversational — this should read like a dev blog retrospective, not documentation.

## Detailed Git History (with file/change stats)
${detailedGitHistory}

## Architecture Context
${architectureContext}

${outputFormatInstructions(keyword, ['A clear narrative arc (start, complications, resolution) rather than a feature-by-feature list'])}`
}

export function buildComparisonPrompt(
  keyword: string,
  architectureContext: string,
): string {
  return `You are a technical blog writer for an indie developer.
Your job is to write a comparison blog post targeting the keyword: "${keyword}"

This keyword implies a "X vs Y" or "X or Y" search intent — identify the two (or more) options
being compared from the keyword itself, and write a genuinely useful comparison for someone
trying to choose between them. Ground any claims about this project's own stack in the
architecture context below; do not invent details about the alternatives, but you may draw on
general, well-established knowledge about them.
Write in first person, as the developer who evaluated these options.
Tone: balanced, opinionated where warranted, honest about tradeoffs — avoid sounding like a
vendor comparison page.

## This Project's Architecture Context
${architectureContext}

${outputFormatInstructions(keyword, [
    'A clear comparison structure (e.g. a summary table or side-by-side sections)',
    'An explicit recommendation of when to pick which option, not just a neutral list of pros/cons',
  ])}`
}

export function buildChangelogPrompt(
  keyword: string,
  gitHistory: string,
): string {
  return `You are a technical blog writer for an indie developer.
Your job is to write release-notes-style blog post targeting the keyword: "${keyword}"

Summarize the real changes from the git history below into a readable changelog post — group
related commits into themes (new features, fixes, refactors) rather than listing every commit
verbatim. Do not invent changes that aren't reflected in the history.
Write in first person, as the developer who shipped these changes.
Tone: concise, factual, upbeat — like a product changelog with a bit of personality.

## Git History (with file/change stats)
${gitHistory}

${outputFormatInstructions(keyword, [
    'Changes grouped into clear themed sections (e.g. "New", "Fixed", "Improved") rather than a raw commit list',
  ])}`
}

export function buildOpinionPrompt(
  keyword: string,
  architectureContext: string,
  gitHistory: string,
): string {
  return `You are a technical blog writer for an indie developer.
Your job is to write an opinion / lessons-learned blog post targeting the keyword: "${keyword}"

This is a "why I chose X" or "what I learned from Y" post. Ground your opinions in the real
architecture and history below — reference actual decisions reflected in the codebase and
commits rather than generic advice. Do not invent details that aren't grounded in the context
provided.
Write in first person, as the developer who made these calls and lived with the consequences.
Tone: candid, opinionated, willing to admit mistakes — this should read like a strong personal
take, not a balanced explainer.

## Architecture Context
${architectureContext}

## Git History
${gitHistory}

${outputFormatInstructions(keyword, ['A clearly stated opinion or takeaway up front, backed by specific reasoning'])}`
}

export function buildListiclePrompt(
  keyword: string,
  codebaseContext: string,
): string {
  return `You are a technical blog writer for an indie developer.
Your job is to write a numbered-list blog post targeting the keyword: "${keyword}"

Structure the post as a numbered list (e.g. "7 things...", "5 ways...") — infer a sensible list
size and framing from the keyword itself. Ground each item in the actual codebase provided
below where relevant; do not invent features or code that don't exist.
Write in first person, as the developer who built this.
Tone: punchy, scannable, conversational — each list item should stand on its own with a clear
takeaway.

## Codebase Context
${codebaseContext}

${outputFormatInstructions(keyword, [
    'Each list item as its own heading (numbered, e.g. "## 1. ...") with a few sentences of substance underneath, not just a one-liner',
  ])}`
}

export function buildSuggestPrompt(
  recentCommits: string,
  architectureContext: string,
  limit: number,
): string {
  return `You are a content strategist for an indie developer's technical blog.
Based on the recent git activity and project architecture below, suggest up to ${limit} blog post
ideas that this developer could realistically write, grounded in what they've actually built.

Do not invent work that isn't reflected in the commits below. Prefer ideas backed by a
meaningful cluster of related commits over ideas based on a single trivial change.

## Recent Commits
${recentCommits}

## Architecture Context
${architectureContext}

## Output Format
Return ONLY a valid JSON array, no explanation, no markdown code fences, no preamble. Each
element must be an object with exactly these fields:
[
  {
    "title": "A specific, compelling blog post title",
    "keyword": "The target SEO keyword for this post",
    "type": "One of: tutorial, story, comparison, changelog, opinion, listicle",
    "reason": "A short explanation of why this was suggested, e.g. '8 commits last week adding auth'",
    "commits": ["short commit message", "short commit message"]
  }
]

Return at most ${limit} suggestions, ordered from strongest to weakest idea.`
}
