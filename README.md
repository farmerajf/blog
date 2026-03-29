# Blog

Static blog built from Obsidian markdown files. Posts are written in Obsidian, imported into this repo, and deployed to GitHub Pages via GitHub Actions.

## How it works

- `posts/` contains markdown files copied from an Obsidian vault
- `images/` contains images referenced by posts (renamed to UUIDs for privacy)
- `src/build.js` converts the markdown to HTML using unified/remark/rehype
- `src/manage.js` is a CLI tool for importing and deleting posts
- On push to `main`, GitHub Actions runs the build and deploys to GitHub Pages

### Obsidian features supported

- YAML frontmatter
- GFM (tables, strikethrough, task lists)
- Syntax-highlighted code blocks
- Image embeds (`![[image.png]]`)
- Callouts (`> [!note]`, `> [!warning]`, `> [!tip]`, `> [!important]`)

### Frontmatter

Posts should have these properties set in Obsidian (capitalized):

```yaml
---
Title: My Post Title
Date: 2026-03-29
Tags: [web, project]
Description: A short summary for the listing page.
---
```

## Setup

```
npm install
```

## Managing posts

```
npm run manage
```

This opens an interactive menu with two options:

- **Import post from Obsidian** -- Paste an Obsidian deep link URL (e.g. `obsidian://open?vault=Personal&file=Articles%2FMy%20Post`). The tool reads the file, finds any `![[image]]` embeds, copies the images with UUID filenames, updates the references, and saves the post to `posts/`.
- **Manage posts** -- Lists all existing posts. Select one to delete it along with its referenced images.

## Local preview

```
npm run build
npx serve build
```

## Deployment

Pushes to `main` trigger the GitHub Actions workflow which builds the site and deploys to GitHub Pages. Set the Pages source to **GitHub Actions** in the repo settings.
