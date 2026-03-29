import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from "fs";
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
const PAGES_DIR = join(ROOT, "pages");
const CSS_DIR = join(ROOT, "css");

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

// --- Markdown processor ---
const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkGfm)
  .use(remarkCallouts)
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
      title: frontmatter.title || slug,
      date: frontmatter.date || "1970-01-01",
      tags: frontmatter.tags || [],
      description: frontmatter.description || "",
      html,
    });
  }

  // Sort by date descending
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Write individual post pages
  for (const post of posts) {
    const outDir = join(BUILD_DIR, "blog", post.slug);
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
  <a href="/blog/${p.slug}/">
    <h2>${p.title}</h2>
  </a>
  <time datetime="${p.date}">${formatDate(p.date)}</time>
  <p>${p.description}</p>
</article>`
    )
    .join("\n");

  mkdirSync(join(BUILD_DIR, "blog"), { recursive: true });
  writeFileSync(
    join(BUILD_DIR, "blog", "index.html"),
    render(blogIndexTemplate, { posts: postListHtml })
  );

  // Copy static pages
  if (readdirSync(PAGES_DIR).length) {
    cpSync(PAGES_DIR, BUILD_DIR, { recursive: true });
  }

  // Copy CSS
  mkdirSync(join(BUILD_DIR, "css"), { recursive: true });
  cpSync(CSS_DIR, join(BUILD_DIR, "css"), { recursive: true });

  console.log(`Built ${posts.length} post(s) → build/`);
}

build();
