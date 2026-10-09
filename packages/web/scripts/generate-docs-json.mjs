import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const DOCS_JSON_PATH = path.join(DOCS_DIR, 'docs.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'packages', 'web', 'src', 'app', 'routes', 'docs', 'docs-generated.json');

const docsConfig = JSON.parse(fs.readFileSync(DOCS_JSON_PATH, 'utf-8'));

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseMdx(content) {
  let frontmatter = {};
  let body = content;

  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      const fmText = content.slice(3, endIdx).trim();
      body = content.slice(endIdx + 3).trim();

      for (const line of fmText.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim();
          let val = line.slice(colonIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          frontmatter[key] = val;
        }
      }
    }
  }

  // Extract headings for Table of Contents
  const toc = [];
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      const level = trimmed.startsWith('## ') ? 2 : 3;
      const title = trimmed.replace(/^#{2,3}\s+/, '').replace(/\*\*/g, '').trim();
      const id = slugify(title);
      if (title && id) {
        toc.push({ id, title, level });
      }
    }
  }

  // Rebrand Activepieces -> Anticeil
  body = body
    .replace(/Activepieces/g, 'Anticeil')
    .replace(/activepieces\.com/g, 'anticeil.com')
    .replace(/activepieces/g, 'anticeil');

  if (frontmatter.title) {
    frontmatter.title = frontmatter.title.replace(/Activepieces/g, 'Anticeil').replace(/activepieces/g, 'anticeil');
  }
  if (frontmatter.sidebarTitle) {
    frontmatter.sidebarTitle = frontmatter.sidebarTitle.replace(/Activepieces/g, 'Anticeil').replace(/activepieces/g, 'anticeil');
  }
  if (frontmatter.description) {
    frontmatter.description = frontmatter.description.replace(/Activepieces/g, 'Anticeil').replace(/activepieces/g, 'anticeil');
  }

  return { frontmatter, body, toc };
}

const allPages = {};

function processPage(pageSlug, tabName, groupName) {
  if (typeof pageSlug !== 'string') return;
  const cleanSlug = pageSlug.replace(/^\//, '').replace(/\.mdx?$/, '');
  
  let filePath = path.join(DOCS_DIR, `${cleanSlug}.mdx`);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DOCS_DIR, `${cleanSlug}.md`);
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DOCS_DIR, cleanSlug, 'index.mdx');
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DOCS_DIR, cleanSlug, 'index.md');
  }

  if (fs.existsSync(filePath)) {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, body, toc } = parseMdx(rawContent);

    allPages[cleanSlug] = {
      slug: cleanSlug,
      tab: tabName,
      group: groupName,
      title: frontmatter.title || cleanSlug.split('/').pop(),
      sidebarTitle: frontmatter.sidebarTitle || frontmatter.title || cleanSlug.split('/').pop(),
      description: frontmatter.description || '',
      icon: frontmatter.icon || '',
      body,
      toc,
    };
  } else {
    // Placeholder if file not found
    allPages[cleanSlug] = {
      slug: cleanSlug,
      tab: tabName,
      group: groupName,
      title: cleanSlug.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      sidebarTitle: cleanSlug.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `Dokumentasi untuk ${cleanSlug}`,
      icon: '',
      body: `## ${cleanSlug}\n\nDokumentasi resmi Anticeil untuk ${cleanSlug}.`,
      toc: [{ id: slugify(cleanSlug), title: cleanSlug, level: 2 }],
    };
  }
}

// Process tabs and navigation from docs.json
const navigation = (docsConfig.navigation && docsConfig.navigation.tabs) || [];

const tabs = navigation.map(t => {
  const tabName = t.tab.replace(/Activepieces/g, 'Anticeil');
  const groups = (t.groups || []).map(g => {
    const groupName = g.group.replace(/Activepieces/g, 'Anticeil');
    const pages = [];

    const handlePages = (pageList) => {
      for (const item of pageList) {
        if (typeof item === 'string') {
          processPage(item, tabName, groupName);
          const pData = allPages[item.replace(/^\//, '').replace(/\.mdx?$/, '')];
          pages.push({
            slug: item.replace(/^\//, '').replace(/\.mdx?$/, ''),
            title: pData?.sidebarTitle || pData?.title || item,
            icon: pData?.icon || '',
          });
        } else if (item && typeof item === 'object') {
          const subGroupName = (item.group || '').replace(/Activepieces/g, 'Anticeil');
          if (item.pages) {
            for (const subItem of item.pages) {
              if (typeof subItem === 'string') {
                processPage(subItem, tabName, subGroupName || groupName);
                const subPData = allPages[subItem.replace(/^\//, '').replace(/\.mdx?$/, '')];
                pages.push({
                  slug: subItem.replace(/^\//, '').replace(/\.mdx?$/, ''),
                  title: subPData?.sidebarTitle || subPData?.title || subItem,
                  icon: subPData?.icon || item.icon || '',
                  subGroup: subGroupName,
                });
              }
            }
          }
        }
      }
    };

    if (g.pages) {
      handlePages(g.pages);
    }

    return {
      name: groupName,
      icon: g.icon || '',
      pages,
    };
  });

  return {
    name: tabName,
    groups,
  };
});

// Also scan all remaining .mdx in docs/ so nothing is missed
function walkDir(dir, baseDir = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(baseDir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_') && entry.name !== 'node_modules') {
      walkDir(fullPath, relPath);
    } else if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) {
      const cleanSlug = relPath.replace(/\\/g, '/').replace(/\.mdx?$/, '');
      if (!allPages[cleanSlug]) {
        processPage(cleanSlug, 'General', 'Docs');
      }
    }
  }
}

walkDir(DOCS_DIR);

// Define redirects
const redirects = {
  'getting-started/introduction': 'overview/welcome',
  'getting-started': 'overview/welcome',
  'welcome': 'overview/welcome',
  'install': 'install/overview',
  'admin-guide': 'admin-guide/overview',
  'embedding': 'embedding/overview',
  'endpoints': 'endpoints/overview',
  'build-pieces': 'build-pieces/building-pieces/overview',
};

if (docsConfig.redirects) {
  for (const r of docsConfig.redirects) {
    const src = r.source.replace(/^\//, '');
    const dest = r.destination.replace(/^\//, '');
    redirects[src] = dest;
  }
}

const result = {
  tabs,
  pages: allPages,
  redirects,
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
console.log(`Generated docs JSON with ${tabs.length} tabs and ${Object.keys(allPages).length} pages at ${OUTPUT_FILE}`);
