---
title: "Sample Blogizi post"
description: "Example markdown with Blogizi-compatible YAML frontmatter for the CLI."
keyword: "blogizi cli sample"
slug: sample-blogizi-post
status: "draft"
date: "2026-08-08"
readingTime: 0
wordCount: 0
# Optional: schedule publish (naive = project timezone). Uncomment to try:
# scheduledAt: "2026-10-26T09:00"
---

This is a sample post for the Blogizi CLI examples.

## Try it

```sh
blogizi draft examples/sample-post.md
blogizi draft examples/sample-post.md --scheduled-at "2026-10-26T09:00"
blogizi update examples/sample-post.md
blogizi update examples/sample-post.md --unschedule
blogizi publish examples/sample-post.md
```

Use `blogizi update` for the same slug after edits. Change the `slug` before `draft`/`publish` if you want a new post. A future `scheduledAt` keeps the post as a draft until Blogizi publishes it.
