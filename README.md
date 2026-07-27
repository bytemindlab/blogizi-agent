# Blogizi CLI

AI agent that turns your codebase into SEO blog posts.

## Install

npm install -g blogizi

## Setup

1. Go to blogizi.com and create a project
2. Copy your API key from the project settings
3. Run:

blogizi auth <api-key>

## Usage

Draft a post (saved as draft):
blogizi draft --keyword "go chi middleware"

Draft and publish immediately:
blogizi draft --keyword "go chi middleware" --publish

Publish a local .md file:
blogizi publish ./blogizi-posts/go-chi-middleware.md

Upload a local .md file as a draft (same as publish, but not live):
blogizi upload ./blogizi-posts/go-chi-middleware.md

## Post Types

Choose the shape of the post with `--type` (defaults to `tutorial`):

blogizi draft --keyword "go chi middleware" --type tutorial     # technical, code-heavy (default)
blogizi draft --keyword "why I rewrote my auth" --type story    # narrative journey, git history driven
blogizi draft --keyword "chi vs gin" --type comparison          # X vs Y, high search intent
blogizi draft --keyword "v2.0 release notes" --type changelog   # release notes from git log
blogizi draft --keyword "why I chose postgres" --type opinion   # why I chose X, lessons learned
blogizi draft --keyword "7 go middleware patterns" --type listicle  # numbered list format

## Suggest Post Ideas

Not sure what to write about? Scan your recent git activity for post ideas:

blogizi suggest
blogizi suggest --ai codex --limit 3

This reads your recent commits and project architecture and proposes titles, keywords, and
post types grounded in what you've actually shipped — no dedup against posts already on your
dashboard, since the CLI doesn't track which project an API key belongs to.

Draft directly from a suggestion:

blogizi draft --keyword "<suggested keyword>" --type <suggested type>

## AI Providers

blogizi draft --keyword "x" --ai claude   # default
blogizi draft --keyword "x" --ai codex
blogizi draft --keyword "x" --ai gemini

Requires the respective CLI to be installed and authenticated on your machine.

## How it works

1. Reads local context suited to the chosen post type (codebase, git history, or
   architecture files)
2. Builds a type-specific, context-aware prompt
3. Shells out to your local AI CLI (claude -p, codex, etc.)
4. Parses the markdown output
5. Saves .md file locally in ./blogizi-posts/
6. Pushes to your Blogizi dashboard via API
