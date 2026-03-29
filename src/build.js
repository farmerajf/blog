import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import matter from "gray-matter";

const ROOT = new URL("..", import.meta.url).pathname;
const POSTS_DIR = join(ROOT, "posts");
const BUILD_DIR = join(ROOT, "build");
const TEMPLATES_DIR = join(ROOT, "src", "templates");
const CSS_DIR = join(ROOT, "css");
const IMAGES_DIR = join(ROOT, "images");

// --- Obsidian callout plugin ---
// Transforms blockquotes starting with [!type] into callout divs
function remarkCallouts() {
  return (tree) => {
    visit(tree, "blockquote", (node, index, parent) => {
      const first = node.children[0];
      if (!first || first.type !== "paragraph" || !first.children[0]) return;

      const textNode = first.children[0];
      if (textNode.type !== "text") return;

      const match = textNode.value.match(/^\[!(\w+)\]\s*(.*)/);
      if (!match) return;

      const [, type, title] = match;
      // Remove the [!type] prefix from the text
      if (title) {
        textNode.value = title;
      } else {
        // Remove the entire first text node if no title remains
        first.children.shift();
        if (first.children.length === 0) {
          node.children.shift();
        }
      }

      // Replace blockquote with a custom callout node that remark-rehype will handle
      parent.children[index] = {
        type: "callout",
        data: {
          hName: "div",
          hProperties: { className: [`callout`, `callout-${type.toLowerCase()}`] },
        },
        children: [
          {
            type: "paragraph",
            data: { hName: "p", hProperties: { className: ["callout-title"] } },
            children: [{ type: "text", value: type.charAt(0).toUpperCase() + type.slice(1) }],
          },
          ...node.children,
        ],
      };
    });
  };
}

function visit(tree, type, fn) {
  if (tree.type === type) fn(tree, null, null);
  if (tree.children) {
    for (let i = 0; i < tree.children.length; i++) {
      const child = tree.children[i];
      if (child.type === type) {
        fn(child, i, tree);
      }
      if (child.children) visit(child, type, fn);
    }
  }
}

// --- Obsidian embed plugin ---
// Converts ![[filename.png]] to standard image nodes
function remarkObsidianEmbeds() {
  return (tree) => {
    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || node.children.length !== 1) return;
      const child = node.children[0];
      if (child.type !== "text") return;

      const match = child.value.match(/^!\[\[(.+?\.(png|jpg|jpeg|gif|webp|svg))\]\]$/i);
      if (!match) return;

      const filename = match[1];
      parent.children[index] = {
        type: "image",
        url: `/images/${encodeURIComponent(filename)}`,
        alt: filename,
      };
    });
  };
}

// --- Markdown processor ---
const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkGfm)
  .use(remarkCallouts)
  .use(remarkObsidianEmbeds)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeHighlight, { detect: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

// --- Template helpers ---
function loadTemplate(name) {
  return readFileSync(join(TEMPLATES_DIR, name), "utf-8");
}

function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function slugify(filename) {
  return basename(filename, ".md");
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// --- Build ---
async function build() {
  rmSync(BUILD_DIR, { recursive: true, force: true });

  const postTemplate = loadTemplate("post.html");
  const blogIndexTemplate = loadTemplate("blog-index.html");

  // Collect and process posts
  const mdFiles = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = [];

  for (const file of mdFiles) {
    const raw = readFileSync(join(POSTS_DIR, file), "utf-8");
    const { data: frontmatter, content } = matter(raw);
    const html = String(await processor.process(content));
    const slug = slugify(file);

    posts.push({
      slug,
      title: frontmatter.Title || slug,
      date: frontmatter.Date || "1970-01-01",
      tags: frontmatter.Tags || [],
      description: frontmatter.Description || "",
      html,
    });
  }

  // Sort by date descending
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Write individual post pages
  for (const post of posts) {
    const outDir = join(BUILD_DIR, post.slug);
    mkdirSync(outDir, { recursive: true });

    const tags = post.tags.map((t) => `<span class="tag">${t}</span>`).join(" ");
    const page = render(postTemplate, {
      title: post.title,
      date: formatDate(post.date),
      tags,
      content: post.html,
    });
    writeFileSync(join(outDir, "index.html"), page);
  }

  // Write blog listing page
  const postListHtml = posts
    .map(
      (p) =>
        `<article class="post-preview">
  <a href="/${p.slug}/">
    <h2>${p.title}</h2>
  </a>
  <time datetime="${p.date}">${formatDate(p.date)}</time>
  <p>${p.description}</p>
</article>`
    )
    .join("\n");

  mkdirSync(BUILD_DIR, { recursive: true });
  writeFileSync(
    join(BUILD_DIR, "index.html"),
    render(blogIndexTemplate, { posts: postListHtml })
  );

  // Copy images
  if (existsSync(IMAGES_DIR)) {
    mkdirSync(join(BUILD_DIR, "images"), { recursive: true });
    cpSync(IMAGES_DIR, join(BUILD_DIR, "images"), { recursive: true });
  }

  // Copy CSS
  mkdirSync(join(BUILD_DIR, "css"), { recursive: true });
  cpSync(CSS_DIR, join(BUILD_DIR, "css"), { recursive: true });

  console.log(`Built ${posts.length} post(s) → build/`);
}

build();
