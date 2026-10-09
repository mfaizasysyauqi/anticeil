import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  Github,
  Globe,
  Layers,
  ListOrdered,
  Menu,
  Moon,
  Search,
  Server,
  Share2,
  Sparkles,
  Sun,
  X,
  Zap,
  Cpu,
  Bot,
  Database,
  Shield,
  Code,
  Terminal,
  FileCode,
  Sliders,
  Check,
  Copy,
  Info,
  AlertTriangle,
  Lightbulb,
  Hash,
} from 'lucide-react';
import { FullLogo } from '@/components/custom/full-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/components/providers/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { localesMap } from '@/lib/locale-utils';
import { getLegalDoc } from './docs-legal';
import docsDataRaw from './docs-generated.json';

const TAB_TRANSLATION_KEYS: Record<string, string> = {
  'Get Started': 'docs.tab.get_started',
  'Build Flows': 'docs.tab.build_flows',
  'Pieces': 'docs.tab.pieces',
  'Developers': 'docs.tab.developers',
  'Self Hosting': 'docs.tab.self_hosting',
};

const GROUP_TRANSLATION_KEYS: Record<string, string> = {
  'Getting Started': 'docs.group.getting_started',
  'Core Concepts': 'docs.group.core_concepts',
  'Building Flows': 'docs.group.building_flows',
  'Legal': 'docs.group.legal',
};

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface PageData {
  slug: string;
  tab: string;
  group: string;
  title: string;
  sidebarTitle: string;
  description: string;
  icon?: string;
  body: string;
  toc: TocItem[];
}

interface NavGroup {
  name: string;
  icon?: string;
  pages: {
    slug: string;
    title: string;
    icon?: string;
    subGroup?: string;
  }[];
}

interface NavTab {
  name: string;
  groups: NavGroup[];
}

const docsData = docsDataRaw as unknown as {
  tabs: NavTab[];
  pages: Record<string, PageData>;
  redirects: Record<string, string>;
};

// Map icons to Lucide components
function getDocIcon(iconName?: string) {
  switch (iconName?.toLowerCase()) {
    case 'robot':
    case 'bot':
      return Bot;
    case 'sitemap':
    case 'workflow':
    case 'zap':
      return Zap;
    case 'table':
    case 'grid':
    case 'database':
      return Database;
    case 'server':
    case 'cpu':
      return Server;
    case 'code':
    case 'terminal':
      return Terminal;
    case 'lock':
    case 'shield':
    case 'key':
      return Shield;
    case 'message':
    case 'chat':
      return Sparkles;
    case 'puzzle-piece':
    case 'plug':
      return Sliders;
    default:
      return BookOpen;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function resolveDocLink(rawUrl: string, currentSlug: string): string {
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    if (rawUrl.includes('activepieces.com/docs/')) {
      const sub = rawUrl.split('activepieces.com/docs/')[1] || '';
      return `/docs/${sub.replace(/\/$/, '')}`;
    }
    return rawUrl;
  }
  let target = rawUrl.trim().replace(/\.(md|mdx)$/, '');
  if (target.startsWith('#')) {
    return target;
  }
  if (target.startsWith('./')) {
    const parts = currentSlug.split('/');
    parts.pop();
    const base = parts.join('/');
    target = base ? `${base}/${target.slice(2)}` : target.slice(2);
  } else if (target.startsWith('../')) {
    const parts = currentSlug.split('/');
    parts.pop();
    while (target.startsWith('../')) {
      parts.pop();
      target = target.slice(3);
    }
    const base = parts.join('/');
    target = base ? `${base}/${target}` : target;
  }
  if (!target.startsWith('/docs')) {
    target = `/docs${target.startsWith('/') ? '' : '/'}${target}`;
  }
  return target;
}

function resolveDocImgSrc(url: string): string {
  let s = url;
  if (s.includes('cdn.anticeil.com/pieces/')) {
    s = s.replace('cdn.anticeil.com/pieces/', 'cdn.activepieces.com/pieces/');
  }
  if (s.startsWith('/resources/') || s.startsWith('resources/')) {
    const clean = s.replace(/^\/?resources\//, '');
    s = `https://raw.githubusercontent.com/activepieces/activepieces/main/docs/resources/${clean.replace('anticeil-', 'activepieces-')}`;
  }
  return s;
}

function DocImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [imgSrc, setImgSrc] = useState(() => resolveDocImgSrc(src));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(resolveDocImgSrc(src));
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      if (imgSrc.includes('cdn.anticeil.com')) {
        setImgSrc(imgSrc.replace('cdn.anticeil.com/pieces/', 'cdn.activepieces.com/pieces/'));
      } else if (src.startsWith('/resources/')) {
        const clean = src.replace(/^\/?resources\//, '');
        setImgSrc(`https://raw.githubusercontent.com/activepieces/activepieces/main/docs/resources/${clean}`);
      } else if (src.startsWith('/img/') || src.startsWith('/images/')) {
        setImgSrc(`https://raw.githubusercontent.com/activepieces/activepieces/main/docs${src}`);
      }
    }
  };

  return (
    <div className="my-6 rounded-xl border border-border/40 bg-card p-2 overflow-hidden shadow-sm flex flex-col items-center justify-center">
      <img
        src={imgSrc}
        alt={alt || 'Documentation illustration'}
        loading="lazy"
        onError={handleError}
        className={`max-w-full h-auto rounded-lg object-contain ${className || ''}`}
      />
      {alt && (
        <span className="text-[11px] text-muted-foreground/80 mt-2 text-center italic">
          {alt}
        </span>
      )}
    </div>
  );
}

function cleanMojibake(text: string): string {
  if (!text) return text;
  return text
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/â†’/g, '→')
    .replace(/å†’/g, '→')
    .replace(/â†['’]/g, '→')
    .replace(/â†”/g, '↔')
    .replace(/â†©/g, '↵')
    .replace(/â†/g, '→')
    .replace(/â€º/g, '›')
    .replace(/â€¹/g, '‹')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€[”"\x9d\x9c]/g, '"')
    .replace(/â€ /g, '— ')
    .replace(/â€¦/g, '…')
    .replace(/âœ…/g, '✅')
    .replace(/âœ“/g, '✓')
    .replace(/â\x9DŒ|â Œ/g, '❌')
    .replace(/â\x9D—/g, '❓')
    .replace(/â‰ˆ/g, '≈')
    .replace(/â‰¤/g, '≤')
    .replace(/â‰¥/g, '≥')
    .replace(/â‰«/g, '≪')
    .replace(/â”€/g, '─')
    .replace(/â”│|â”‚/g, '│')
    .replace(/â”œ/g, '├')
    .replace(/â””/g, '└')
    .replace(/â”Œ/g, '┌')
    .replace(/â”\x90|â” /g, '┐')
    .replace(/â”┤/g, '┤')
    .replace(/â”┴/g, '┴')
    .replace(/â”┬/g, '┬')
    .replace(/â”¼/g, '┼')
    .replace(/â”˜/g, '┘')
    .replace(/â–¼/g, '▼')
    .replace(/â–▶|â–¶/g, '▶')
    .replace(/â˜•/g, '☕')
    .replace(/âœ¨/g, '✨')
    .replace(/âˆ’/g, '−')
    .replace(/âˆˆ/g, '∈')
    .replace(/â€/g, '—');
}

function renderFormattedText(text: string, currentSlug: string = '', depth = 0): React.ReactNode {
  if (!text) return null;
  const cleanedText = cleanMojibake(text);

  // If text starts with markdown heading prefix (e.g. inside an accordion or list: "#### Title")
  if (depth === 0) {
    const headingInline = cleanedText.match(/^(#{1,6})\s*(.*)$/);
    if (headingInline) {
      const level = headingInline[1].length;
      const hText = headingInline[2];
      return (
        <span className={`block font-bold text-foreground my-2 ${
          level === 1 ? 'text-xl' : level === 2 ? 'text-lg' : level === 3 ? 'text-base' : 'text-sm'
        }`}>
          {renderFormattedText(hText, currentSlug, depth + 1)}
        </span>
      );
    }
  }

  if (depth > 5) return cleanedText;

  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleanedText)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(cleanedText.slice(lastIndex, match.index));
    }

    const [, , linkText, linkUrl, boldText, codeText, italicText] = match;
    const key = `fmt-${depth}-${lastIndex}-${match.index}`;

    if (linkText && linkUrl) {
      const cleanUrl = linkUrl.trim().split(/\s+/)[0];
      const resolved = resolveDocLink(cleanUrl, currentSlug);
      const isExternal = resolved.startsWith('http://') || resolved.startsWith('https://');
      const innerContent = renderFormattedText(linkText, currentSlug, depth + 1);
      if (isExternal) {
        nodes.push(
          <a
            key={key}
            href={resolved}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
          >
            <span>{innerContent}</span>
            <ExternalLink className="w-3 h-3 inline-block ml-0.5 opacity-70" />
          </a>,
        );
      } else {
        nodes.push(
          <Link
            key={key}
            to={resolved}
            className="text-primary hover:underline font-medium"
          >
            {innerContent}
          </Link>,
        );
      }
    } else if (boldText !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {renderFormattedText(boldText, currentSlug, depth + 1)}
        </strong>,
      );
    } else if (codeText !== undefined) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-muted text-foreground font-medium dark:text-emerald-300 border border-border/60 font-mono text-[12px]"
        >
          {codeText}
        </code>,
      );
    } else if (italicText !== undefined) {
      nodes.push(
        <em key={key} className="italic text-foreground/90">
          {renderFormattedText(italicText, currentSlug, depth + 1)}
        </em>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleanedText.length) {
    nodes.push(cleanedText.slice(lastIndex));
  }

  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

export function DocsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  const getPageTitle = (p: { slug: string; title: string }) => {
    if (p.slug === 'legal/terms') return t('docs.page.terms');
    if (p.slug === 'legal/privacy') return t('docs.page.privacy');
    return p.title;
  };

  // Resolved theme for icon display (system → detect actual)
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  // Extract slug from path
  const currentSlug = useMemo(() => {
    let raw = location.pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');
    if (!raw) raw = 'overview/welcome';
    if (docsData.redirects[raw]) {
      raw = docsData.redirects[raw];
    }
    return raw;
  }, [location.pathname]);

  // Current page data
  const currentPage: PageData = useMemo(() => {
    const legalDoc = getLegalDoc(currentSlug, i18n.language);
    if (legalDoc) return legalDoc;

    if (docsData.pages[currentSlug]) {
      return docsData.pages[currentSlug];
    }
    // Fallback: search by ending slug
    const matchedKey = Object.keys(docsData.pages).find(
      (k) => k.endsWith('/' + currentSlug) || k === currentSlug,
    );
    if (matchedKey && docsData.pages[matchedKey]) {
      const legalMatch = getLegalDoc(matchedKey, i18n.language);
      if (legalMatch) return legalMatch;
      return docsData.pages[matchedKey];
    }
    return docsData.pages['overview/welcome'];
  }, [currentSlug, i18n.language]);

  // Active Tab
  const activeTabName = useMemo(() => {
    return currentPage?.tab || 'Get Started';
  }, [currentPage]);

  const activeTab = useMemo(() => {
    return (
      docsData.tabs.find((t) => t.name === activeTabName) || docsData.tabs[0]
    );
  }, [activeTabName]);

  // Handle Tab Switch
  const handleSelectTab = (tab: NavTab) => {
    const firstGroup = tab.groups[0];
    const firstPage = firstGroup?.pages[0];
    if (firstPage) {
      navigate(`/docs/${firstPage.slug}`);
    }
  };

  // Handle Code Copy
  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll to hash if present
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentSlug, location.hash]);

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: PageData[] = [];
    for (const page of Object.values(docsData.pages)) {
      if (
        page.title.toLowerCase().includes(q) ||
        page.sidebarTitle.toLowerCase().includes(q) ||
        page.description.toLowerCase().includes(q) ||
        page.slug.toLowerCase().includes(q)
      ) {
        results.push(page);
        if (results.length >= 10) break;
      }
    }
    return results;
  }, [searchQuery]);

  // Content Renderer with MDX support
  const renderMdxContent = (body: string) => {
    // Process markdown cards and custom blocks
    const cleanBody = cleanMojibake(body);
    const lines = cleanBody.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const elements: React.ReactNode[] = [];
    let inCardGroup = false;
    let cardItems: React.ReactNode[] = [];
    let cardCols = 2;
    let inTable = false;
    let tableRows: string[][] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockContent: string[] = [];
    let codeBlockIdx = 0;

    const flushTable = () => {
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const bodyRows = tableRows.slice(1);
        elements.push(
          <div
            key={`table-${elements.length}`}
            className="my-6 overflow-x-auto rounded-lg border border-border/50"
          >
            <table className="w-full min-w-[500px] text-left text-xs sm:text-sm">
              <thead className="bg-muted/50 text-foreground border-b border-border/50 font-semibold">
                <tr>
                  {header.map((col, idx) => (
                    <th key={idx} className="px-4 py-2.5 whitespace-nowrap">
                      {renderFormattedText(col.trim(), currentSlug)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2 text-foreground/90 dark:text-foreground/85">
                        {renderFormattedText(cell.trim(), currentSlug)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        tableRows = [];
      }
      inTable = false;
    };

    const flushCards = () => {
      if (cardItems.length > 0) {
        const gridColsClass =
          cardCols === 3
            ? 'grid-cols-1 md:grid-cols-3'
            : cardCols === 4
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
              : 'grid-cols-1 md:grid-cols-2';

        elements.push(
          <div
            key={`cardgroup-${elements.length}`}
            className={`grid ${gridColsClass} gap-4 my-6`}
          >
            {cardItems}
          </div>,
        );
        cardItems = [];
      }
      inCardGroup = false;
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code blocks
      if (trimmed.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLang = trimmed.replace('```', '').trim();
          codeBlockContent = [];
        } else {
          inCodeBlock = false;
          const currentCode = codeBlockContent.join('\n');
          const thisIndex = codeBlockIdx++;
          elements.push(
            <div
              key={`code-${elements.length}`}
              className="my-6 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono">{codeBlockLang || 'bash'}</span>
                <button
                  onClick={() => handleCopyCode(currentCode, thisIndex)}
                  className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
                >
                  {copiedCodeIndex === thisIndex ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{t('docs.code.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('docs.code.copy')}</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto text-emerald-400">
                <code>{currentCode}</code>
              </pre>
            </div>
          );
        }
        i++;
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        i++;
        continue;
      }

      // Check CardGroup
      if (trimmed.startsWith('<CardGroup')) {
        const colMatch = trimmed.match(/cols={?(\d+)}?/);
        cardCols = colMatch ? parseInt(colMatch[1], 10) : 2;
        inCardGroup = true;
        i++;
        continue;
      }

      if (trimmed.startsWith('</CardGroup>')) {
        flushCards();
        i++;
        continue;
      }

      // Inside CardGroup or single Card
      if (trimmed.startsWith('<Card ') || inCardGroup) {
        if (trimmed.startsWith('<Card ')) {
          // Collect the full opening tag (which may span multiple lines if icon={<svg ...>} or icon={<img ...>})
          let openTagBuffer = trimmed;
          let braceCount = 0;
          for (const char of openTagBuffer) {
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
          }
          while (
            i + 1 < lines.length &&
            (braceCount > 0 || !openTagBuffer.trimEnd().endsWith('>')) &&
            !lines[i + 1].trim().startsWith('</Card>')
          ) {
            i++;
            const nextLine = lines[i].trim();
            openTagBuffer += ' ' + nextLine;
            for (const char of nextLine) {
              if (char === '{') braceCount++;
              else if (char === '}') braceCount--;
            }
          }

          // Parse attributes from the full opening tag buffer
          const titleMatch = openTagBuffer.match(/title="([^"]+)"/);
          const hrefMatch = openTagBuffer.match(/href="([^"]+)"/);
          const colorMatch = openTagBuffer.match(/color="([^"]+)"/);
          const svgIconMatch = openTagBuffer.match(/icon=\{\s*(<svg[\s\S]*?<\/svg>)\s*\}/);
          const imgIconMatch = openTagBuffer.match(/icon=\{\s*<img[^>]*src="([^"]+)"[^>]*\/?>\s*\}/);
          const stringIconMatch = openTagBuffer.match(/icon="([^"]+)"/);

          const cardTitle = titleMatch ? titleMatch[1] : '';
          const cardHref = hrefMatch ? hrefMatch[1] : '';
          const cardColor = colorMatch ? colorMatch[1] : '#6366F1';
          const cardSvgHtml = svgIconMatch ? svgIconMatch[1] : null;
          const cardImgSrc = imgIconMatch ? imgIconMatch[1] : null;
          const cardIcon = stringIconMatch ? stringIconMatch[1] : '';

          // Collect body — only plain text lines, skip HTML/JSX/attrs
          let cardDesc = '';
          i++;
          while (i < lines.length && !lines[i].trim().startsWith('</Card>')) {
            const ln = lines[i].trim();
            const isHtmlTag = ln.startsWith('<') || ln.startsWith('</') || ln.includes('</svg>') || ln.includes('<svg') || ln.includes('<path');
            const isJsxExpr = ln.startsWith('{') || ln.startsWith('}') || ln.includes('href=') || ln.includes('icon=');
            const isAttrLine = /^[a-zA-Z_-]+=/.test(ln); // e.g. href="..." icon={
            const isBareClose = ln === '>' || ln === '/>';
            if (!isHtmlTag && !isJsxExpr && !isAttrLine && !isBareClose && ln.length > 0) {
              // Strip any remaining inline HTML/JSX from the line
              const cleaned = ln
                .replace(/<[^>]*>/g, '')
                .replace(/\{[^}]*\}/g, '')
                .trim();
              if (cleaned.length > 0) cardDesc += (cardDesc ? ' ' : '') + cleaned;
            }
            i++;
          }

          const CardIconComponent = getDocIcon(cardIcon);

          const cardNode = (
            <div
              key={`card-${cardItems.length}-${cardTitle}`}
              onClick={() => {
                if (cardHref) {
                  if (cardHref.startsWith('http')) {
                    window.open(cardHref, '_blank');
                  } else {
                    const resolved = resolveDocLink(cardHref, currentSlug);
                    navigate(resolved);
                  }
                }
              }}
              className="p-5 rounded-xl border border-border/50 bg-card/70 hover:bg-muted hover:border-primary/50 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3.5 transition-transform group-hover:scale-105 overflow-hidden"
                  style={{
                    backgroundColor: `${cardColor}20`,
                    color: cardColor,
                  }}
                >
                  {cardSvgHtml ? (
                    <div
                      className="w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 [&>svg]:max-w-full [&>svg]:max-h-full"
                      dangerouslySetInnerHTML={{ __html: cardSvgHtml }}
                    />
                  ) : cardImgSrc ? (
                    <img src={cardImgSrc} alt={cardTitle} className="w-5 h-5 object-contain" />
                  ) : (
                    <CardIconComponent className="w-5 h-5" />
                  )}
                </div>
                <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  <span>{cardTitle}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {renderFormattedText(cardDesc.trim(), currentSlug)}
                </p>
              </div>
            </div>
          );

          if (inCardGroup) {
            cardItems.push(cardNode);
          } else {
            elements.push(
              <div key={`single-card-${elements.length}`} className="my-4">
                {cardNode}
              </div>,
            );
          }
          i++;
          continue;
        }
      }

      // Notes and callouts
      if (
        trimmed.startsWith('<Note') ||
        trimmed.startsWith('<Info') ||
        trimmed.startsWith('<Tip') ||
        trimmed.startsWith('<Warning')
      ) {
        const isWarning = trimmed.startsWith('<Warning');
        const isTip = trimmed.startsWith('<Tip');
        let noteContent = '';
        i++;
        while (
          i < lines.length &&
          !lines[i].trim().startsWith('</Note>') &&
          !lines[i].trim().startsWith('</Info>') &&
          !lines[i].trim().startsWith('</Tip>') &&
          !lines[i].trim().startsWith('</Warning>')
        ) {
          noteContent += ' ' + lines[i].trim();
          i++;
        }

        elements.push(
          <div
            key={`callout-${elements.length}`}
            className={`my-5 p-4 rounded-xl border text-xs sm:text-sm flex gap-3.5 items-start ${
              isWarning
                ? 'bg-amber-500/10 border-amber-500/30'
                : isTip
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-indigo-500/10 border-indigo-500/30'
            }`}
          >
            {isWarning ? (
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            ) : isTip ? (
              <Lightbulb className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            )}
            <div className="leading-relaxed text-foreground/90">
              {renderFormattedText(noteContent.trim(), currentSlug)}
            </div>
          </div>,
        );
        i++;
        continue;
      }

      // AI Prompt blocks
      if (trimmed.startsWith('<Prompt')) {
        const descMatch = trimmed.match(/description="([^"]+)"/);
        const promptDesc = descMatch ? descMatch[1] : 'AI Assistant Prompt';
        let promptBody = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('</Prompt>')) {
          promptBody += (promptBody ? '\n' : '') + lines[i];
          i++;
        }
        const promptIdx = codeBlockIdx++;
        const currentPrompt = promptBody.trim();
        elements.push(
          <div
            key={`prompt-${elements.length}`}
            className="my-6 rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-primary/20 text-xs text-primary font-medium">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{promptDesc}</span>
              </span>
              <button
                onClick={() => handleCopyCode(currentPrompt, promptIdx)}
                className="flex items-center gap-1 hover:text-foreground transition-colors text-muted-foreground"
              >
                {copiedCodeIndex === promptIdx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-500">{t('docs.code.copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('docs.code.copy')}</span>
                  </>
                )}
              </button>
            </div>
            <div className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">
              {renderFormattedText(currentPrompt, currentSlug)}
            </div>
          </div>,
        );
        i++;
        continue;
      }

      // Accordion
      if (trimmed.startsWith('<Accordion ') || trimmed.startsWith('<AccordionGroup')) {
        if (trimmed.startsWith('<AccordionGroup')) {
          i++;
          continue;
        }
        const titleMatch = trimmed.match(/title="([^"]+)"/);
        const accTitle = titleMatch ? titleMatch[1] : 'Details';
        let accBody = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('</Accordion>')) {
          accBody += (accBody ? '\n' : '') + lines[i];
          i++;
        }
        elements.push(
          <details
            key={`acc-${elements.length}`}
            className="my-3 rounded-lg border border-border/40 bg-muted/10 p-3.5 text-xs sm:text-sm group"
          >
            <summary className="font-semibold text-foreground cursor-pointer select-none list-none flex items-center justify-between">
              <span>{accTitle}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
            </summary>
            <div className="pt-3 text-foreground/85 dark:text-muted-foreground leading-relaxed space-y-2">
              {accBody.split('\n').filter(l => l.trim()).map((l, lIdx) => (
                <div key={lIdx}>{renderFormattedText(l.trim(), currentSlug)}</div>
              ))}
            </div>
          </details>,
        );
        i++;
        continue;
      }

      // Steps container and Step elements (<Steps> and <Step title="...">)
      if (trimmed.startsWith('<Steps>') || trimmed.startsWith('<Steps ') || trimmed.startsWith('</Steps>')) {
        i++;
        continue;
      }

      if (trimmed.startsWith('<Step ') || trimmed.startsWith('<Step>')) {
        const titleMatch = trimmed.match(/title="([^"]+)"/);
        const iconMatch = trimmed.match(/icon="([^"]+)"/);
        const stepTitle = titleMatch ? titleMatch[1] : 'Step';
        const stepIcon = iconMatch ? iconMatch[1] : '';
        const stepLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('</Step>')) {
          stepLines.push(lines[i]);
          i++;
        }

        const StepIconComp = stepIcon ? getDocIcon(stepIcon) : null;

        elements.push(
          <div
            key={`step-${elements.length}`}
            className="relative pl-8 sm:pl-10 my-6 border-l-2 border-primary/30 last:border-l-0"
          >
            <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary font-bold text-xs shadow-xs">
              {StepIconComp ? <StepIconComp className="w-3.5 h-3.5" /> : <span>{elements.length + 1}</span>}
            </div>
            <h4 className="text-base sm:text-lg font-bold text-foreground mb-2">
              {renderFormattedText(stepTitle, currentSlug)}
            </h4>
            <div className="text-xs sm:text-sm text-foreground/85 dark:text-muted-foreground leading-relaxed space-y-2">
              {stepLines.filter(l => l.trim()).map((l, lIdx) => (
                <div key={lIdx}>{renderFormattedText(l.trim(), currentSlug)}</div>
              ))}
            </div>
          </div>,
        );
        i++;
        continue;
      }

      // Frame wrappers
      if (trimmed.startsWith('<Frame') || trimmed.startsWith('</Frame>')) {
        i++;
        continue;
      }

      // Markdown Tables — also handle rows that don't have trailing |
      if (trimmed.startsWith('|')) {
        inTable = true;
        // Normalize: ensure we can split on |
        const normalized = trimmed.endsWith('|') ? trimmed.slice(1, -1) : trimmed.slice(1);
        const row = normalized.split('|').map((c) => c.trim());
        // ignore separator row like |---|---|
        if (!row.every((c) => /^:?-+:?$/.test(c) || c === '')) {
          tableRows.push(row);
        }
        i++;
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headings (H1 to H6)
      const headingMatch = trimmed.match(/^(#{1,6})\s*(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const rawTitle = headingMatch[2].replace(/\*\*/g, '').trim();
        const headingText = cleanMojibake(rawTitle);
        const headingId = slugify(headingText);

        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        const headingClass =
          level === 1
            ? 'text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground'
            : level === 2
              ? 'text-xl sm:text-2xl font-bold tracking-tight text-foreground'
              : level === 3
                ? 'text-lg font-bold tracking-tight text-foreground'
                : level === 4
                  ? 'text-base font-bold tracking-tight text-foreground'
                  : 'text-sm font-semibold tracking-tight text-foreground';

        const wrapperSpacing =
          level === 1 || level === 2
            ? 'mt-10 mb-4'
            : level === 3
              ? 'mt-8 mb-3'
              : level === 4
                ? 'mt-6 mb-2.5'
                : 'mt-5 mb-2';

        elements.push(
          <div
            key={`heading-${elements.length}`}
            id={headingId}
            className={`group scroll-mt-32 ${wrapperSpacing}`}
          >
            <HeadingTag className={`${headingClass} flex items-center gap-2`}>
              <span>{renderFormattedText(headingText, currentSlug)}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.getElementById(headingId);
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    window.history.pushState(null, '', `${location.pathname}#${headingId}`);
                    setActiveHeadingId(headingId);
                    try {
                      navigator.clipboard.writeText(`${window.location.origin}${location.pathname}#${headingId}`);
                    } catch {
                      // ignore clipboard errors
                    }
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/60 hover:text-primary transition-opacity p-0.5 rounded cursor-pointer"
                title="Salin tautan ke bagian ini"
                aria-label={`Link to ${headingText}`}
              >
                <Hash className="w-3.5 h-3.5" />
              </button>
            </HeadingTag>
          </div>,
        );
        i++;
        continue;
      }

      // HTML <div> container blocks (e.g. multi-image apps lists, MCP client badge rows, etc.)
      if (trimmed.startsWith('<div')) {
        let divBuffer = line;
        if (!trimmed.includes('</div>')) {
          i++;
          while (i < lines.length && !lines[i].includes('</div>')) {
            divBuffer += '\n' + lines[i];
            i++;
          }
          if (i < lines.length) {
            divBuffer += '\n' + lines[i];
          }
        }

        // Case A: Multi-image inline container (e.g. piece apps list)
        if (divBuffer.includes('<img')) {
          const imgRegex = /<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/g;
          let match;
          const iconList: { src: string; alt: string }[] = [];
          while ((match = imgRegex.exec(divBuffer)) !== null) {
            let s = match[1];
            if (s.includes('cdn.anticeil.com/pieces/')) {
              s = s.replace('cdn.anticeil.com/pieces/', 'cdn.activepieces.com/pieces/');
            }
            iconList.push({ src: s, alt: match[2] || '' });
          }
          if (iconList.length > 0) {
            elements.push(
              <div
                key={`icon-grid-${elements.length}`}
                className="my-3 flex flex-wrap gap-2.5 items-center"
              >
                {iconList.map((ic, icIdx) => (
                  <div
                    key={icIdx}
                    className="w-11 h-11 rounded-xl bg-card border border-border/50 p-2 flex items-center justify-center shadow-xs hover:scale-105 transition-transform"
                    title={ic.alt}
                  >
                    <img
                      src={ic.src}
                      alt={ic.alt}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('cdn.activepieces.com')) {
                          target.src = `https://cdn.activepieces.com/pieces/${ic.alt.toLowerCase().replace(/\s+/g, '-')}.png`;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>,
            );
            i++;
            continue;
          }
        }

        // Case B: Multi-item span badges/clients (e.g. MCP clients: Claude, Copilot, Cursor, Gemini CLI, Windsurf, Zed)
        if (
          divBuffer.includes('<span') &&
          (divBuffer.includes('<svg') ||
            divBuffer.includes('Claude') ||
            divBuffer.includes('Cursor'))
        ) {
          const spanRegex = /<span[^>]*>([\s\S]*?)<\/span>/g;
          let spanMatch;
          const clientBadges: { svg?: string; text: string }[] = [];
          while ((spanMatch = spanRegex.exec(divBuffer)) !== null) {
            const inner = spanMatch[1];
            const svgMatch = inner.match(/<svg[\s\S]*?<\/svg>/);
            const textOnly = inner
              .replace(/<svg[\s\S]*?<\/svg>/g, '')
              .replace(/<[^>]+>/g, '')
              .trim();
            if (textOnly || svgMatch) {
              clientBadges.push({
                svg: svgMatch ? svgMatch[0] : undefined,
                text: textOnly,
              });
            }
          }

          if (clientBadges.length > 0) {
            elements.push(
              <div
                key={`client-badges-${elements.length}`}
                className="my-4 flex flex-wrap gap-2.5 items-center"
              >
                {clientBadges.map((badge, bIdx) => (
                  <div
                    key={bIdx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-card/70 hover:bg-muted/40 hover:border-border transition-all text-xs sm:text-sm font-medium text-foreground shadow-xs group"
                  >
                    {badge.svg && (
                      <span
                        className="w-4 h-4 shrink-0 flex items-center justify-center text-foreground/80 group-hover:text-foreground [&>svg]:w-4 [&>svg]:h-4 [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:fill-current"
                        dangerouslySetInnerHTML={{ __html: badge.svg }}
                      />
                    )}
                    <span>{badge.text}</span>
                  </div>
                ))}
              </div>,
            );
            i++;
            continue;
          }
        }

        i++;
        continue;
      }

      // Ignore stray closing HTML tags or break lines
      if (
        trimmed.startsWith('</') ||
        trimmed.startsWith('<br') ||
        trimmed === '</div>' ||
        trimmed === '</span>'
      ) {
        i++;
        continue;
      }

      // HTML img tags
      if (trimmed.includes('<img')) {
        const srcMatch = trimmed.match(/src="([^"]+)"/);
        const altMatch = trimmed.match(/alt="([^"]+)"/);
        if (srcMatch) {
          elements.push(
            <DocImage
              key={`img-${elements.length}`}
              src={srcMatch[1]}
              alt={altMatch ? altMatch[1] : ''}
            />,
          );
          i++;
          continue;
        }
      }

      // Markdown image ![alt](src)
      const mdImgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (mdImgMatch) {
        elements.push(
          <DocImage
            key={`mdimg-${elements.length}`}
            src={mdImgMatch[2]}
            alt={mdImgMatch[1]}
          />,
        );
        i++;
        continue;
      }

      // Videos — collect multi-line <video> tags and resolve src
      if (trimmed.includes('<video') || (trimmed.endsWith('.mp4') && !trimmed.startsWith('<'))) {
        let vidSrc: string | null = null;
        if (trimmed.endsWith('.mp4')) {
          vidSrc = trimmed;
        } else {
          // collect until </video>
          const videoLines: string[] = [trimmed];
          if (!trimmed.includes('</video>')) {
            i++;
            while (i < lines.length && !lines[i].includes('</video>')) {
              videoLines.push(lines[i].trim());
              i++;
            }
            if (i < lines.length) videoLines.push(lines[i].trim());
          }
          const combined = videoLines.join(' ');
          const srcMatch = combined.match(/src="([^"]+)"/);
          vidSrc = srcMatch ? srcMatch[1] : null;
        }
        if (vidSrc) {
          // Resolve relative video paths to GitHub CDN fallback
          const resolvedVid = vidSrc.startsWith('http') ? vidSrc
            : vidSrc.startsWith('/resources/')
              ? vidSrc
              : `https://raw.githubusercontent.com/activepieces/activepieces/main/docs${vidSrc.startsWith('/') ? '' : '/'}${vidSrc}`;
          elements.push(
            <div
              key={`vid-${elements.length}`}
              className="my-6 rounded-xl border border-border/50 bg-card p-2 overflow-hidden shadow-sm"
            >
              <video
                src={resolvedVid}
                controls
                className="w-full rounded-lg max-h-[500px]"
              />
            </div>,
          );
        }
        i++;
        continue;
      }

      // App logos / multi-line SVG blocks — collect all lines until </svg>
      if (trimmed.startsWith('<svg') || trimmed === '<svg>') {
        const svgLines: string[] = [line];
        i++;
        while (i < lines.length && !lines[i].includes('</svg>')) {
          svgLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) svgLines.push(lines[i]); // closing </svg>
        elements.push(
          <div
            key={`svg-${elements.length}`}
            className="my-4 overflow-x-auto flex justify-center"
            dangerouslySetInnerHTML={{ __html: svgLines.join('\n') }}
          />,
        );
        i++;
        continue;
      }

      // Horizontal dividers
      if (trimmed === '---' || trimmed === '***') {
        elements.push(
          <hr
            key={`hr-${elements.length}`}
            className="my-8 border-t border-border/40"
          />,
        );
        i++;
        continue;
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote
            key={`bq-${elements.length}`}
            className="my-4 border-l-2 border-primary/50 pl-4 py-1 text-xs sm:text-sm text-foreground/80 dark:text-muted-foreground italic"
          >
            {renderFormattedText(trimmed.slice(2), currentSlug)}
          </blockquote>,
        );
        i++;
        continue;
      }

      // Unordered lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const listText = trimmed.slice(2);
        elements.push(
          <li
            key={`li-${elements.length}`}
            className="text-xs sm:text-sm text-foreground/85 dark:text-muted-foreground ml-4 list-disc leading-relaxed my-1"
          >
            {renderFormattedText(listText, currentSlug)}
          </li>,
        );
        i++;
        continue;
      }

      // Numbered lists
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        elements.push(
          <li
            key={`oli-${elements.length}`}
            className="text-xs sm:text-sm text-foreground/85 dark:text-muted-foreground ml-5 list-decimal leading-relaxed my-1"
          >
            {renderFormattedText(numMatch[2], currentSlug)}
          </li>,
        );
        i++;
        continue;
      }

      // Paragraphs
      if (trimmed.length > 0 && !trimmed.startsWith('<')) {
        elements.push(
          <p
            key={`p-${elements.length}`}
            className="text-xs sm:text-sm text-foreground/85 dark:text-muted-foreground leading-relaxed my-3"
          >
            {renderFormattedText(trimmed, currentSlug)}
          </p>,
        );
      }

      i++;
    }

    if (inTable) flushTable();
    if (inCardGroup) flushCards();

    return elements;
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground font-sans antialiased">
      {/* 1. Global Header (Symmetric max-w-[1440px] px-6 lg:px-8) */}
      <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/30"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link
              to="/docs/overview/welcome"
              className="flex items-center gap-2.5 group"
            >
              <FullLogo className="h-7 w-auto" />
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-primary/15 text-primary border border-primary/25">
                {t('docs.badge')}
              </span>
            </Link>
          </div>

          {/* Center Search Input */}
          <div className="flex-1 max-w-md mx-auto hidden sm:block">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg border border-border/50 bg-muted hover:bg-muted/70 hover:border-primary/40 text-xs text-muted-foreground transition-all focus:outline-none"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{t('docs.search.placeholder')}</span>
              </span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-background/60 border border-border/50 rounded text-muted-foreground shadow-xs">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <a
              href="https://github.com/mfaizasysyauqi/anticeil"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors hidden lg:inline-flex items-center gap-1.5"
            >
              <Github className="w-4 h-4" />
              {t('docs.header.github')}
            </a>
            <Link
              to="/flows"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors hidden lg:inline-block"
            >
              {t('docs.header.pieces')}
            </Link>

            {/* Language Switcher Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="px-2 py-1.5 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all flex items-center gap-1.5 text-xs font-medium"
                  aria-label={t('docs.header.language', 'Language')}
                  title={t('docs.header.language', 'Language')}
                >
                  <Globe className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="hidden md:inline">
                    {localesMap[i18n.language as keyof typeof localesMap] || 'English'}
                  </span>
                  <span className="md:hidden font-semibold text-[11px] uppercase">
                    {i18n.language ? i18n.language.slice(0, 2) : 'EN'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 max-h-72 overflow-y-auto">
                {Object.entries(localesMap).map(([code, label]) => {
                  const isSelected =
                    i18n.language === code || (code === 'en' && !i18n.language);
                  return (
                    <DropdownMenuItem
                      key={code}
                      onClick={() => i18n.changeLanguage(code)}
                      className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                    >
                      <span>{label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              aria-label={t('docs.header.theme', 'Toggle theme')}
              title={t('docs.header.theme', 'Toggle theme')}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
            <a
              href="https://anticeil.com/sign-up"
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-2.5 sm:px-3.5 h-8 gap-1 rounded-lg shadow-sm"
              >
                <span>{t('docs.header.sign_up')}</span>
                <ChevronRight className="w-3 h-3 hidden sm:inline-block" />
              </Button>
            </a>
          </div>
        </div>

        {/* 2. Global Secondary Tabs Bar (Symmetric max-w-[1440px] px-6 lg:px-8) */}
        <div className="border-t border-border/30 bg-background/70">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-7 overflow-x-auto text-xs sm:text-sm scrollbar-none h-11">
            {docsData.tabs.map((tab) => {
              const isActive = tab.name === activeTabName;
              const tabLabel = t(
                TAB_TRANSLATION_KEYS[tab.name] || tab.name,
                tab.name,
              );
              return (
                <button
                  key={tab.name}
                  onClick={() => handleSelectTab(tab)}
                  className={`h-full flex items-center transition-colors whitespace-nowrap border-b-2 font-medium ${
                    isActive
                      ? 'border-primary text-foreground font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tabLabel}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 3. Main Layout Container (Symmetric max-w-[1440px] px-6 lg:px-8) */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex min-h-[calc(100vh-6.75rem)]">
        {/* Left Sidebar (Desktop) */}
        <aside className="w-64 shrink-0 py-8 pr-6 border-r border-border/30 sticky top-[6.75rem] h-[calc(100vh-6.75rem)] overflow-y-auto hidden lg:block scrollbar-thin">
          <div className="space-y-6">
            {activeTab.groups.map((group) => {
              const groupLabel = t(
                GROUP_TRANSLATION_KEYS[group.name] || group.name,
                group.name,
              );
              return (
                <div key={group.name} className="space-y-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2.5">
                    {groupLabel}
                  </h4>
                  <div className="space-y-0.5">
                    {group.pages.map((p) => {
                      const isPageActive =
                        p.slug === currentSlug ||
                        (currentSlug === 'overview/welcome' &&
                          p.slug === 'overview/welcome');
                      const PageIcon = getDocIcon(p.icon);
                      const title = getPageTitle(p);

                      return (
                        <button
                          key={p.slug}
                          onClick={() => navigate(`/docs/${p.slug}`)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left group ${
                            isPageActive
                              ? 'bg-primary/15 text-primary font-semibold shadow-xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                          }`}
                        >
                          <PageIcon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isPageActive
                                ? 'text-primary'
                                : 'text-muted-foreground/70 group-hover:text-foreground'
                            }`}
                          />
                          <span className="truncate">{title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden flex">
            <div className="w-80 bg-card border-r border-border/50 h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <span className="font-bold text-sm tracking-tight text-foreground">
                  {t('docs.sidebar.navigation')}
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Language & Theme Controls in Mobile Drawer */}
              <div className="space-y-2 border-b border-border/30 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    {t('docs.header.language')}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-2.5 py-1 rounded-md border border-border/40 text-xs font-medium flex items-center gap-1 bg-muted/30">
                        <span>
                          {localesMap[i18n.language as keyof typeof localesMap] || 'English'}
                        </span>
                        <ChevronRight className="w-3 h-3 rotate-90" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                      {Object.entries(localesMap).map(([code, label]) => (
                        <DropdownMenuItem
                          key={code}
                          onClick={() => i18n.changeLanguage(code)}
                          className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                        >
                          <span>{label}</span>
                          {i18n.language === code && <Check className="w-3.5 h-3.5 text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    {isDark ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                    {t('docs.header.theme')}
                  </span>
                  <button
                    onClick={toggleTheme}
                    className="px-2.5 py-1 rounded-md border border-border/40 text-xs font-medium flex items-center gap-1.5 bg-muted/30 hover:bg-muted/60"
                  >
                    {isDark ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>{isDark ? 'Dark' : 'Light'}</span>
                  </button>
                </div>
              </div>

              {/* Mobile Tabs */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('docs.sidebar.category')}
                </span>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {docsData.tabs.map((tab) => {
                    const tabLabel = t(
                      TAB_TRANSLATION_KEYS[tab.name] || tab.name,
                      tab.name,
                    );
                    return (
                      <button
                        key={tab.name}
                        onClick={() => {
                          handleSelectTab(tab);
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-md text-left truncate ${
                          tab.name === activeTabName
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'bg-muted/30 text-muted-foreground'
                        }`}
                      >
                        {tabLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6 pt-2">
                {activeTab.groups.map((group) => {
                  const groupLabel = t(
                    GROUP_TRANSLATION_KEYS[group.name] || group.name,
                    group.name,
                  );
                  return (
                    <div key={group.name} className="space-y-1">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                        {groupLabel}
                      </h4>
                      <div className="space-y-0.5">
                        {group.pages.map((p) => {
                          const isPageActive = p.slug === currentSlug;
                          const title = getPageTitle(p);
                          return (
                            <button
                              key={p.slug}
                              onClick={() => {
                                navigate(`/docs/${p.slug}`);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left ${
                                isPageActive
                                  ? 'bg-primary/15 text-primary font-medium'
                                  : 'text-muted-foreground hover:bg-muted/20'
                              }`}
                            >
                              <span className="truncate">{title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              className="flex-1"
              onClick={() => setMobileMenuOpen(false)}
            />
          </div>
        )}

        {/* Center Main Content */}
        <main className="flex-1 min-w-0 py-8 px-4 sm:px-8 lg:px-12 max-w-4xl">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span>
              {t(
                GROUP_TRANSLATION_KEYS[currentPage.group] || currentPage.group,
                currentPage.group || currentPage.tab,
              )}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-foreground font-medium">
              {currentPage.title}
            </span>
          </div>

          {/* Heading and Description */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {currentPage.title}
            </h1>
            {currentPage.description && (
              <p className="text-sm sm:text-base text-foreground/85 dark:text-muted-foreground mt-2 leading-relaxed">
                {cleanMojibake(currentPage.description)}
              </p>
            )}
          </div>

          {/* Mobile / Tablet In-Page TOC Collapsible */}
          {currentPage.toc && currentPage.toc.length > 0 && (
            <div className="xl:hidden mb-6 rounded-lg border border-border/40 bg-card/60 p-3">
              <details className="group">
                <summary className="flex items-center justify-between text-xs font-semibold text-foreground cursor-pointer list-none select-none">
                  <span className="flex items-center gap-2">
                    <ListOrdered className="w-3.5 h-3.5 text-primary" />
                    <span>{t('docs.toc.title')}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                </summary>
                <nav className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
                  {(() => {
                    const seen = new Set<string>();
                    const uniqueToc = currentPage.toc.filter((item) => {
                      if (seen.has(item.title)) return false;
                      seen.add(item.title);
                      return true;
                    }).slice(0, 25);
                    return uniqueToc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          const target = document.getElementById(item.id);
                          if (target) {
                            target.scrollIntoView({ behavior: 'smooth' });
                            window.history.pushState(null, '', `#${item.id}`);
                            setActiveHeadingId(item.id);
                          }
                        }}
                        className={`block text-xs py-1 transition-colors ${
                          item.level === 3 ? 'pl-3 text-muted-foreground/80' : 'text-muted-foreground'
                        } hover:text-foreground`}
                      >
                        {cleanMojibake(item.title)}
                      </a>
                    ));
                  })()}
                </nav>
              </details>
            </div>
          )}

          <div className="border-b border-border/30 my-6" />

          {/* Render MDX Body */}
          <div className="space-y-2">
            {renderMdxContent(currentPage.body)}
          </div>

          {/* Page Footer / Feedback */}
          <div className="mt-14 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>{t('docs.page.helpful')}</span>
              <button className="px-2.5 py-1 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
                {t('docs.page.yes')}
              </button>
              <button className="px-2.5 py-1 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
                {t('docs.page.no')}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={`https://github.com/mfaizasysyauqi/anticeil/edit/main/docs/${currentPage.slug}.mdx`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <span>{t('docs.page.suggest_edits')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://github.com/mfaizasysyauqi/anticeil/issues/new"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
              >
                {t('docs.page.raise_issue')}
              </a>
            </div>
          </div>
        </main>

        {/* Right Sidebar ("On this page" Table of Contents) */}
        <aside className="w-60 shrink-0 py-8 pl-6 border-l border-border/20 sticky top-[6.75rem] h-[calc(100vh-6.75rem)] overflow-y-auto hidden xl:block scrollbar-thin">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ListOrdered className="w-3.5 h-3.5" />
              <span>{t('docs.toc.title')}</span>
            </div>
            <nav className="space-y-1.5">
              {currentPage.toc && currentPage.toc.length > 0 ? (
                (() => {
                  // Deduplicate by title, keep first occurrence, cap at 25
                  const seen = new Set<string>();
                  const uniqueToc = currentPage.toc.filter((item) => {
                    if (seen.has(item.title)) return false;
                    seen.add(item.title);
                    return true;
                  }).slice(0, 25);
                  return uniqueToc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const target = document.getElementById(item.id);
                        if (target) {
                          target.scrollIntoView({ behavior: 'smooth' });
                          window.history.pushState(null, '', `#${item.id}`);
                          setActiveHeadingId(item.id);
                        }
                      }}
                      className={`block text-xs leading-snug transition-colors ${
                        item.level === 3 ? 'pl-3' : ''
                      } ${
                        activeHeadingId === item.id
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cleanMojibake(item.title)}
                    </a>
                  ));
                })()
              ) : (
                <span className="text-xs text-muted-foreground/60 italic">
                  {t('docs.toc.overview')}
                </span>
              )}
            </nav>
          </div>
        </aside>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-lg bg-popover border border-border/60 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('docs.search.modal.placeholder')}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground p-1"
              >
                ESC
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/20">
              {searchResults.length > 0 ? (
                searchResults.map((res) => (
                  <button
                    key={res.slug}
                    onClick={() => {
                      navigate(`/docs/${res.slug}`);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-primary/10 transition-colors group flex flex-col"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground group-hover:text-primary">
                        {getPageTitle(res)}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {t(TAB_TRANSLATION_KEYS[res.tab] || res.tab, res.tab)}
                      </span>
                    </div>
                    {res.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {res.description}
                      </p>
                    )}
                  </button>
                ))
              ) : searchQuery.trim() ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  {t('docs.search.no_results', { query: searchQuery })}
                </div>
              ) : (
                <div className="p-4 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">{t('docs.search.popular_guides')}</p>
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    <button
                      onClick={() => {
                        navigate('/docs/overview/welcome');
                        setSearchOpen(false);
                      }}
                      className="text-left p-1.5 rounded hover:bg-muted/30 text-xs text-primary"
                    >
                      {t('docs.search.welcome')}
                    </button>
                    <button
                      onClick={() => {
                        navigate('/docs/agents/overview');
                        setSearchOpen(false);
                      }}
                      className="text-left p-1.5 rounded hover:bg-muted/30 text-xs text-primary"
                    >
                      {t('docs.search.agents')}
                    </button>
                    <button
                      onClick={() => {
                        navigate('/docs/flows/building-flows');
                        setSearchOpen(false);
                      }}
                      className="text-left p-1.5 rounded hover:bg-muted/30 text-xs text-primary"
                    >
                      {t('docs.search.flows')}
                    </button>
                    <button
                      onClick={() => {
                        navigate('/docs/install/overview');
                        setSearchOpen(false);
                      }}
                      className="text-left p-1.5 rounded hover:bg-muted/30 text-xs text-primary"
                    >
                      {t('docs.search.hosting')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
