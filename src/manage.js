import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join, basename, extname } from "path";
import { randomUUID } from "crypto";
import { select, input, confirm } from "@inquirer/prompts";
import matter from "gray-matter";

const ROOT = new URL("..", import.meta.url).pathname;
const POSTS_DIR = join(ROOT, "posts");
const IMAGES_DIR = join(ROOT, "images");

// --- Obsidian helpers ---

function getVaultPaths() {
  const configPath = join(
    process.env.HOME,
    "Library/Application Support/obsidian/obsidian.json"
  );
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  const vaults = {};
  for (const v of Object.values(config.vaults)) {
    const name = basename(v.path);
    vaults[name.toLowerCase()] = v.path;
  }
  return vaults;
}

function parseObsidianUrl(url) {
  const parsed = new URL(url);
  const vault = parsed.searchParams.get("vault");
  const file = parsed.searchParams.get("file");
  if (!vault || !file) throw new Error("Invalid Obsidian URL — needs vault and file params");
  return { vault, file: decodeURIComponent(file) };
}

function findFileInVault(vaultPath, filename) {
  function search(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = search(full);
        if (found) return found;
      } else if (entry.name === filename) {
        return full;
      }
    }
    return null;
  }
  return search(vaultPath);
}

// --- Import ---

async function importPost() {
  const url = await input({ message: "Obsidian URL:" });

  let vault, file;
  try {
    ({ vault, file } = parseObsidianUrl(url));
  } catch (e) {
    console.log(`Error: ${e.message}`);
    return;
  }

  const vaults = getVaultPaths();
  const vaultPath = vaults[vault.toLowerCase()];
  if (!vaultPath) {
    console.log(`Vault "${vault}" not found. Available: ${Object.keys(vaults).join(", ")}`);
    return;
  }

  const filePath = join(vaultPath, file + ".md");
  if (!existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const raw = readFileSync(filePath, "utf-8");
  const slug = basename(file).toLowerCase().replace(/\s+/g, "-");
  const destPath = join(POSTS_DIR, `${slug}.md`);

  if (existsSync(destPath)) {
    const overwrite = await confirm({ message: `Post "${slug}" already exists. Overwrite?` });
    if (!overwrite) return;
  }

  // Find and copy images, replace references
  const imageRegex = /!\[\[(.+?\.(png|jpg|jpeg|gif|webp|svg))\]\]/gi;
  let content = raw;
  const matches = [...raw.matchAll(imageRegex)];

  if (matches.length > 0) {
    mkdirSync(IMAGES_DIR, { recursive: true });
    console.log(`Found ${matches.length} image(s)`);
  }

  for (const match of matches) {
    const originalName = match[1];
    const ext = extname(originalName);
    const uuid = randomUUID();
    const newName = `${uuid}${ext}`;

    const imagePath = findFileInVault(vaultPath, originalName);
    if (!imagePath) {
      console.log(`  Warning: image not found in vault: ${originalName}`);
      continue;
    }

    const imageData = readFileSync(imagePath);
    writeFileSync(join(IMAGES_DIR, newName), imageData);
    content = content.replace(`![[${originalName}]]`, `![[${newName}]]`);
    console.log(`  ${originalName} -> ${newName}`);
  }

  writeFileSync(destPath, content);
  console.log(`\nImported: posts/${slug}.md`);
}

// --- Manage posts ---

async function managePosts() {
  const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

  if (files.length === 0) {
    console.log("No posts found.");
    return;
  }

  const posts = files.map((f) => {
    const raw = readFileSync(join(POSTS_DIR, f), "utf-8");
    const { data } = matter(raw);
    return {
      file: f,
      title: data.Title || basename(f, ".md"),
      date: data.Date || "",
    };
  });

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const choice = await select({
    message: "Select a post to delete (or go back):",
    choices: [
      ...posts.map((p) => ({
        name: `${p.date || "no date"} — ${p.title}`,
        value: p.file,
      })),
      { name: "Back", value: null },
    ],
  });

  if (!choice) return;

  const ok = await confirm({ message: `Delete ${choice} and its images?` });
  if (!ok) return;

  // Find images referenced by this post
  const raw = readFileSync(join(POSTS_DIR, choice), "utf-8");
  const imageRefs = [...raw.matchAll(/!\[\[(.+?\.(png|jpg|jpeg|gif|webp|svg))\]\]/gi)];

  for (const ref of imageRefs) {
    const imgPath = join(IMAGES_DIR, ref[1]);
    if (existsSync(imgPath)) {
      unlinkSync(imgPath);
      console.log(`  Deleted image: ${ref[1]}`);
    }
  }

  unlinkSync(join(POSTS_DIR, choice));
  console.log(`Deleted: ${choice}`);
}

// --- Main menu ---

async function main() {
  while (true) {
    const action = await select({
      message: "Blog Manager",
      choices: [
        { name: "Import post from Obsidian", value: "import" },
        { name: "Manage posts", value: "manage" },
        { name: "Exit", value: "exit" },
      ],
    });

    if (action === "exit") break;
    if (action === "import") await importPost();
    if (action === "manage") await managePosts();
    console.log();
  }
}

main();
