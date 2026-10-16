# Blogizi plugin for Claude

Write blog posts with Claude and publish them to your own domain with [Blogizi](https://blogizi.com). Claude drafts the post as markdown, you approve it, and Blogizi publishes it on `blog.yourapp.com` or `yourapp.com/blog` with sitemaps, canonical URLs, meta tags, JSON-LD and Open Graph images handled for you.

## What's inside

- **Blogizi skill** (`skills/blogizi/SKILL.md`): teaches Claude how to write a post as markdown with frontmatter (title, description, keyword, slug) and how to draft, update or publish it with the Blogizi CLI.
- **Blogizi MCP server** (`.mcp.json`): connects Claude to the hosted Blogizi server at `https://blogizi.com/api/mcp`. You sign in with your Blogizi account the first time a tool runs. Tools: list projects, draft post, upload post image, update post, publish post, and read Google Search Console performance (Pro and Agency plans).

Posts are saved as drafts unless you ask Claude to publish.

## Install

In Claude Code:

```text
/plugin install blogizi --marketplace bytemindlab/blogizi-agent
```

On older Claude Code versions, add the marketplace first:

```text
/plugin marketplace add bytemindlab/blogizi-agent
/plugin install blogizi@blogizi-agent
```

## Requirements

A Blogizi account with an active plan or 7-day trial. Plans start at $9/month: [blogizi.com/#pricing](https://blogizi.com/#pricing).

## What it runs and where data goes

- Installing the plugin runs no code: there are no hooks, scripts or bundled binaries.
- When you ask Claude to publish from your machine, the skill has Claude install and run the open-source `blogizi` CLI from npm (`npm install -g blogizi`). Its source is at [github.com/bytemindlab/blogizi-agent](https://github.com/bytemindlab/blogizi-agent).
- The CLI and the MCP server send data only to `blogizi.com`: the post's markdown and frontmatter, images you choose to upload, and your Blogizi sign-in token. The CLI stores its sign-in in `~/.blogizi/config.json` (file mode `600`).
- Disconnect any time with `blogizi logout`, or under **Dashboard → Account → API → Connected apps** on blogizi.com.
- Privacy policy: [blogizi.com/privacy-policy](https://blogizi.com/privacy-policy). Support: support@blogizi.com.

## Example prompts

- "Write a post about how we built our auth flow and save it as a draft on my Blogizi blog."
- "Which queries am I ranking on page 2 for? Draft a post for the best one."
- "Update the meta description of my Next.js post so it's under 155 characters."

## License

AGPL-3.0. See [LICENSE](./LICENSE).
