---
name: blogizi
description: >-
  Draft, update, and publish SEO blog posts to Blogizi from a local repo using
  the Blogizi CLI and account API. Use when the user mentions Blogizi, blogizi
  draft/update/publish, posting markdown to a blog, SEO blog posts, or
  integrating with the Blogizi public API / Obsidian plugin workflow.
homepage: https://blogizi.com/docs/cli-publishing
---

# Blogizi CLI — AI Agent Guide

Help the human ship blog posts to [Blogizi](https://blogizi.com) from their local repository. **You** (the coding agent) write the markdown in plain text; the CLI only authenticates and drafts/updates/publishes. Full human docs: [README.md](./README.md). Site overview: https://blogizi.com/llms.txt

## Hard rules

1. **Never ask the user to paste an API key into chat.** Tell them to run `blogizi auth <key>` locally (or edit `~/.blogizi/config.json` themselves).
2. **Never commit** `~/.blogizi/config.json`, API keys, or `.env` secrets.
3. **Default to drafts.** Use `blogizi draft` for the first push unless the user explicitly asks to go live (`blogizi publish`).
4. **Use `blogizi update` to re-push edits** to an existing slug (same file after improvements). Do not invent a new slug just to avoid conflicts.
5. **Do not invent Blogizi dashboard UI steps** beyond Account → API and project Settings. Prefer CLI + README.
6. **Do not shell out to `claude` / `codex` / `gemini` via Blogizi.** Write the `.md` file yourself (or with the user), then `blogizi draft` / `blogizi update`. Do not shell out to Claude/Codex/Gemini for Blogizi.

## Prerequisites checklist

Before drafting or publishing, verify (run commands; don't assume):

```sh
node -v                    # need >= 20
which blogizi || npm install -g blogizi
blogizi --help
test -f ~/.blogizi/config.json || echo "NOT AUTHENTICATED"
```

If not authenticated:

```text
Ask the user to:
1. Open https://blogizi.com → Dashboard → Account → API
2. Copy the account API key
3. Run locally: blogizi auth <api-key>
4. If they have multiple projects: blogizi use <project-slug>
```

## Core workflows

### A. Write → draft → edit → update → publish (recommended)

```sh
# 1. You write ./posts/<slug>.md with Blogizi frontmatter (grounded in the repo)

# 2. Upload as draft
blogizi draft ./posts/<slug>.md

# 3. Improve the file with the user, then update the same slug
blogizi update ./posts/<slug>.md

# 4. Only when the user confirms "publish" / "make it live"
blogizi publish ./posts/<slug>.md
```

### B. Multi-project accounts

```sh
blogizi use the-correct-project-slug
# or
blogizi auth <key> --project the-correct-project-slug
```

Wrong project is a common failure mode — confirm slug when the user has more than one blog.

## Frontmatter pattern (required for draft/update/publish)

```yaml
---
title: "How we built our auth flow"
description: "≤160 char meta description; specific, not clickbait"
keyword: "indie app authentication"
slug: how-we-built-our-auth-flow
status: "draft"
date: "2026-08-07"
readingTime: 0
wordCount: 0
---

Body markdown here. Do not repeat the title as an H1 — the blog UI already shows the title.
```

**Writing tips**

- Ground the post in **this** repo (real APIs, files, decisions). Avoid generic filler.
- `slug`: lowercase kebab-case; stable (changing slug creates a new post unless using `blogizi update` / API `upsert` on the old slug first).
- `description`: one sentence, SEO-useful.
- `keyword`: phrase the post should rank for.
- `status` in the file is overridden by `draft` (→ draft) and `publish` (→ published). `update` only changes status when the file sets `status` explicitly; otherwise the existing post keeps its visibility.

## Public API patterns (when CLI is unavailable)

Base: `https://blogizi.com`

```http
Authorization: Bearer YOUR_ACCOUNT_API_KEY
X-Blogizi-Project: project-slug
Content-Type: application/json
```

### Create post

```http
POST /api/posts
```

```json
{
  "title": "…",
  "slug": "…",
  "description": "…",
  "keyword": "…",
  "content": "markdown body",
  "status": "draft",
  "upsert": false,
  "projectSlug": "optional-if-header-set"
}
```

- `upsert: true` → update existing post with the same slug (Obsidian plugin and `blogizi update`). CLI `draft` / `publish` omit upsert (create-only); `blogizi update` always sends upsert.
- List projects: `GET /api/account/projects`

**Prefer shelling out to `blogizi draft` / `blogizi update` / `blogizi publish`** instead of raw `curl` unless the user wants API integration code.

## Usage examples (copy-ready)

```sh
# First-time setup (user runs with their key)
blogizi auth "$BLOGIZI_API_KEY" --project my-app

# After you wrote the markdown
blogizi draft ./content/rate-limiting-with-redis.md

# After edits to the same slug
blogizi update ./content/rate-limiting-with-redis.md

# User said publish
blogizi publish ./content/rate-limiting-with-redis.md
```

## Best practices

1. **Write from the project root** so paths and repo context stay clear.
2. **One keyword per post** — narrow beats vague ("oauth pkce nextauth" > "authentication").
3. **Review before publish** — show the user the file path + title/description; wait for explicit publish.
4. **Edit then update** — after improving the `.md`, `blogizi update` with the same slug (do not use `draft` again for an existing slug — create will fail).
5. **Don't spam publish** — no automated publish loops without human approval.
6. **Link related docs** when helpful: CLI publishing, markdown frontmatter, Obsidian plugin.

## Error handling

| Symptom | Likely cause | Agent action |
| --- | --- | --- |
| `Not authenticated. Run: blogizi auth …` | Missing `~/.blogizi/config.json` | Instruct user to auth locally; do not request the key in chat |
| `Not authenticated` / 401 from API | Bad or rotated key | User regenerates key in Account → API, re-runs `blogizi auth` |
| Error about multiple projects / project required | No `projectSlug` with multi-project account | `blogizi use <slug>` or auth with `--project` |
| Upload/publish 4xx duplicate slug | Post slug already exists | Use `blogizi update` for that slug, or change slug for a new post |
| Wrong blog updated | Wrong active project | Confirm `projectSlug` in config; `blogizi use` correct slug |
| `npm install -g blogizi` fails | Node too old / permissions | Need Node 20+; suggest `nvm` or local `npm link` from clone |
| Network / fetch failed | Offline or API unreachable | Check connectivity to blogizi.com |
| `blogizi draft` / `suggest` not found | Confused with old AI draft, or `suggest` removed | Use `blogizi draft <file.md>` to save a draft; write the file yourself first |
| Need to change a live post | Existing published slug | `blogizi update path/to/post.md` (omit `status` in frontmatter to keep published) |

When a command fails: capture stderr, classify using the table, propose the **smallest** next step (usually one command for the user to run).

## Anti-patterns

- Pasting API keys into prompts, commits, or GitHub issues
- Running `blogizi publish` without explicit user consent
- Calling non-existent `blogizi suggest` or inventing AI-provider flags (`--ai claude`, etc.)
- Inventing endpoints that aren't in the README / llms.txt
- Assuming session-cookie dashboard routes work with the API key (PATCH/DELETE post by id are session-only today)

## Quick decision tree

```text
User wants a Blogizi post?
├─ Not installed/authed? → install + user runs blogizi auth (+ use)
├─ Need content? → YOU write .md with frontmatter (from repo context)
├─ First push / new slug? → blogizi draft path/to/post.md
├─ Edits to existing slug? → blogizi update path/to/post.md
└─ User said go live? → blogizi publish path/to/post.md
```

## Related links

- README (primary docs): [README.md](./README.md)
- https://blogizi.com/docs/cli-publishing
- https://blogizi.com/docs/markdown-frontmatter
- https://blogizi.com/docs/obsidian
- https://blogizi.com/llms.txt
