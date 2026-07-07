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

## AI Providers

blogizi draft --keyword "x" --ai claude   # default
blogizi draft --keyword "x" --ai codex
blogizi draft --keyword "x" --ai gemini

Requires the respective CLI to be installed and authenticated on your machine.

## How it works

1. Reads your local codebase and git history
2. Builds a context-aware prompt
3. Shells out to your local AI CLI (claude -p, codex, etc.)
4. Parses the markdown output
5. Saves .md file locally in ./blogizi-posts/
6. Pushes to your Blogizi dashboard via API
