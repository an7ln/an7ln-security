# AN7LN Security

站点 / Site: https://qqyln.cn

A static security-research publication built with Astro 6, Markdown/MDX, Tailwind CSS 4, Pagefind and Giscus. It is designed for Cloudflare Workers static assets and a GitHub-first writing workflow.

## Local development

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

`npm run build` generates the Astro site and then creates the Pagefind index. Use `npm run preview` after a build to test production search locally.

## Writing

- Research and public disclosure posts: `src/content/research/`
- Field notes: `src/content/notes/`
- Projects: `src/content/projects/`

Frontmatter is validated in `src/content.config.ts`. Draft entries are never published, but drafts are not a security boundary: unpublished vulnerability details, tokens, customer data and unpatched PoCs must stay in a separate private repository and must never enter this repository or its Git history.

## Giscus

Enable GitHub Discussions on the public repository, install the Giscus app, obtain the IDs from giscus.app, then copy `.env.example` to `.env` and fill the four `PUBLIC_GISCUS_*` values. The comments component stays absent until all required values are present.

## Deploy to Cloudflare

The site is fully static; no Astro Cloudflare adapter is required.

1. Push this directory to a GitHub repository.
2. In Cloudflare Workers & Pages, import the repository.
3. Set the build command to `npm run build` and the output directory to `dist`.
4. Set `SITE_URL` to the production origin.
5. Optionally deploy from the CLI with `npm run deploy`.

Cloudflare's Git integration provides preview deployments for pull requests and publishes on pushes to `main`.

## Automated publishing

Bot-assisted publishing must use pull requests and narrowly scoped GitHub permissions. See `AUTOMATION.md` for the Grok Bot workflow, content boundaries and required review gate.
