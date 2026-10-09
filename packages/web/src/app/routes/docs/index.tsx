import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { FullLogo } from '@/components/custom/full-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import docsDataRaw from './docs-generated.json';

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

function DocImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError && src.startsWith('/resources/')) {
      setHasError(true);
      const fallbackUrl = `https://raw.githubusercontent.com/activepieces/activepieces/main/docs${src.replace('/anticeil-', '/activepieces-')}`;
      setImgSrc(fallbackUrl);
    }
  };

  return (
    <div className="my-6 rounded-xl border border-border/40 bg-[#0d121c] p-2 overflow-hidden shadow-sm flex flex-col items-center justify-center">
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

function renderFormattedText(text: string, currentSlug: string = ''): React.ReactNode {
  if (!text) return null;

  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const [, , linkText, linkUrl, boldText, codeText, italicText] = match;
    const key = `fmt-${lastIndex}-${match.index}`;

    if (linkText && linkUrl) {
      const resolved = resolveDocLink(linkUrl, currentSlug);
      const isExternal = resolved.startsWith('http://') || resolved.startsWith('https://');
      if (isExternal) {
        nodes.push(
          <a
            key={key}
            href={resolved}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
          >
            <span>{linkText}</span>
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
            {linkText}
          </Link>,
        );
      }
    } else if (boldText !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {boldText}
        </strong>,
      );
    } else if (codeText !== undefined) {
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-muted/80 text-primary border border-border/50 font-mono text-xs"
        >
          {codeText}
        </code>,
      );
    } else if (italicText !== undefined) {
      nodes.push(
        <em key={key} className="italic text-foreground/90">
          {italicText}
        </em>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length === 1 ? nodes[0] : <>{nodes}</>;
}

export function DocsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

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
    if (docsData.pages[currentSlug]) {
      return docsData.pages[currentSlug];
    }
    // Fallback: search by ending slug
    const matchedKey = Object.keys(docsData.pages).find(
      (k) => k.endsWith('/' + currentSlug) || k === currentSlug,
    );
    if (matchedKey && docsData.pages[matchedKey]) {
      return docsData.pages[matchedKey];
    }
    return docsData.pages['overview/welcome'];
  }, [currentSlug]);

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
    const lines = body.split('\n');
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
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-muted/40 text-foreground border-b border-border/50 font-semibold">
                <tr>
                  {header.map((col, idx) => (
                    <th key={idx} className="px-4 py-2.5">
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
                      <td key={cIdx} className="px-4 py-2 text-muted-foreground">
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
              className="my-6 rounded-xl border border-border/60 bg-[#0d1117] overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/40 text-xs text-muted-foreground">
                <span className="font-mono">{codeBlockLang || 'bash'}</span>
                <button
                  onClick={() => handleCopyCode(currentCode, thisIndex)}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  {copiedCodeIndex === thisIndex ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-green-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto text-emerald-300">
                <code>{currentCode}</code>
              </pre>
            </div>,
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
          const titleMatch = trimmed.match(/title="([^"]+)"/);
          const iconMatch = trimmed.match(/icon="([^"]+)"/);
          const hrefMatch = trimmed.match(/href="([^"]+)"/);
          const colorMatch = trimmed.match(/color="([^"]+)"/);

          const cardTitle = titleMatch ? titleMatch[1] : '';
          const cardIcon = iconMatch ? iconMatch[1] : '';
          const cardHref = hrefMatch ? hrefMatch[1] : '';
          const cardColor = colorMatch ? colorMatch[1] : '#6366F1';

          // Extract inner text
          let cardDesc = '';
          i++;
          while (i < lines.length && !lines[i].trim().startsWith('</Card>')) {
            cardDesc += ' ' + lines[i].trim();
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
              className="p-5 rounded-xl border border-border/50 bg-[#111726]/70 hover:bg-[#151c2e] hover:border-primary/50 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3.5 transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: `${cardColor}20`,
                    color: cardColor,
                  }}
                >
                  <CardIconComponent className="w-5 h-5" />
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
                ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                : isTip
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                  : 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200'
            }`}
          >
            {isWarning ? (
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            ) : isTip ? (
              <Lightbulb className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
            )}
            <div className="leading-relaxed">
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
                    <span className="text-green-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
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
            <div className="pt-3 text-muted-foreground leading-relaxed">
              {renderFormattedText(accBody.trim(), currentSlug)}
            </div>
          </details>,
        );
        i++;
        continue;
      }

      // Frame wrappers
      if (trimmed.startsWith('<Frame') || trimmed.startsWith('</Frame>')) {
        i++;
        continue;
      }

      // Markdown Tables
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const row = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        // ignore separator row like |---|---|
        if (!row.every((c) => /^:?-+:?$/.test(c))) {
          tableRows.push(row);
        }
        i++;
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headings
      if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        const isH2 = trimmed.startsWith('## ');
        const headingText = trimmed
          .replace(/^#{2,3}\s+/, '')
          .replace(/\*\*/g, '')
          .trim();
        const headingId = slugify(headingText);

        elements.push(
          <div
            key={`heading-${elements.length}`}
            id={headingId}
            className={`group scroll-mt-32 ${isH2 ? 'mt-10 mb-4' : 'mt-8 mb-3'}`}
          >
            {isH2 ? (
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{headingText}</span>
                <a
                  href={`#${headingId}`}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity text-sm"
                  aria-label={`Link to ${headingText}`}
                >
                  #
                </a>
              </h2>
            ) : (
              <h3 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                <span>{headingText}</span>
                <a
                  href={`#${headingId}`}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity text-xs"
                  aria-label={`Link to ${headingText}`}
                >
                  #
                </a>
              </h3>
            )}
          </div>,
        );
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

      // Videos
      if (trimmed.includes('<video') || trimmed.endsWith('.mp4')) {
        const srcMatch = trimmed.match(/src="([^"]+)"/);
        const vidSrc = srcMatch ? srcMatch[1] : trimmed;
        elements.push(
          <div
            key={`vid-${elements.length}`}
            className="my-6 rounded-xl border border-border/50 bg-[#0c1017] p-2 overflow-hidden shadow-sm"
          >
            <video
              src={vidSrc}
              controls
              className="w-full rounded-lg max-h-[500px]"
            />
          </div>,
        );
        i++;
        continue;
      }

      // App logos / HTML fallback
      if (trimmed.includes('<svg')) {
        elements.push(
          <div
            key={`html-${elements.length}`}
            className="my-4 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: line }}
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
            className="my-4 border-l-2 border-primary/50 pl-4 py-1 text-xs sm:text-sm text-muted-foreground italic"
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
            className="text-xs sm:text-sm text-muted-foreground ml-4 list-disc leading-relaxed my-1"
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
            className="text-xs sm:text-sm text-muted-foreground ml-5 list-decimal leading-relaxed my-1"
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
            className="text-xs sm:text-sm text-muted-foreground leading-relaxed my-3"
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
    <div className="min-h-screen bg-[#090d14] text-foreground selection:bg-primary/30 selection:text-primary-foreground font-sans antialiased">
      {/* 1. Global Header (Symmetric max-w-[1440px] px-6 lg:px-8) */}
      <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-[#090d14]/90 backdrop-blur-md">
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
                Docs
              </span>
            </Link>
          </div>

          {/* Center Search Input */}
          <div className="flex-1 max-w-md mx-auto hidden sm:block">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg border border-border/50 bg-[#121824] hover:bg-[#161f30] hover:border-primary/40 text-xs text-muted-foreground transition-all focus:outline-none"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Search Anticeil docs...</span>
              </span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-background/60 border border-border/50 rounded text-muted-foreground shadow-xs">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <a
              href="https://github.com/mfaizasysyauqi/anticeil"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:inline-flex items-center gap-1.5"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <Link
              to="/flows"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:inline-block"
            >
              Pieces
            </Link>
            <a
              href="https://anticeil.com/sign-up"
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-3.5 h-8 gap-1.5 rounded-lg shadow-sm"
              >
                <span>Sign Up</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        </div>

        {/* 2. Global Secondary Tabs Bar (Symmetric max-w-[1440px] px-6 lg:px-8) */}
        <div className="border-t border-border/30 bg-[#090d14]/70">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-7 overflow-x-auto text-xs sm:text-sm scrollbar-none h-11">
            {docsData.tabs.map((tab) => {
              const isActive = tab.name === activeTabName;
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
                  {tab.name}
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
            {activeTab.groups.map((group) => (
              <div key={group.name} className="space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2.5">
                  {group.name}
                </h4>
                <div className="space-y-0.5">
                  {group.pages.map((p) => {
                    const isPageActive =
                      p.slug === currentSlug ||
                      (currentSlug === 'overview/welcome' &&
                        p.slug === 'overview/welcome');
                    const PageIcon = getDocIcon(p.icon);

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
                        <span className="truncate">{p.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden flex">
            <div className="w-72 bg-[#0d131f] border-r border-border/50 h-full p-6 overflow-y-auto space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <span className="font-bold text-sm tracking-tight text-foreground">
                  Navigation
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Tabs */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Category
                </span>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {docsData.tabs.map((tab) => (
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
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 pt-2">
                {activeTab.groups.map((group) => (
                  <div key={group.name} className="space-y-1">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                      {group.name}
                    </h4>
                    <div className="space-y-0.5">
                      {group.pages.map((p) => {
                        const isPageActive = p.slug === currentSlug;
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
                            <span className="truncate">{p.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
            <span>{currentPage.group || currentPage.tab}</span>
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
              <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
                {currentPage.description}
              </p>
            )}
          </div>

          <div className="border-b border-border/30 my-6" />

          {/* Render MDX Body */}
          <div className="space-y-2">
            {renderMdxContent(currentPage.body)}
          </div>

          {/* Page Footer / Feedback */}
          <div className="mt-14 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>Was this page helpful?</span>
              <button className="px-2.5 py-1 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
                Yes
              </button>
              <button className="px-2.5 py-1 rounded-md border border-border/50 hover:bg-muted/30 transition-colors">
                No
              </button>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={`https://github.com/mfaizasysyauqi/anticeil/edit/main/docs/${currentPage.slug}.mdx`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <span>Suggest edits</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://github.com/mfaizasysyauqi/anticeil/issues/new"
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary transition-colors"
              >
                Raise issue
              </a>
            </div>
          </div>
        </main>

        {/* Right Sidebar ("On this page" Table of Contents) */}
        <aside className="w-60 shrink-0 py-8 pl-6 border-l border-border/20 sticky top-[6.75rem] h-[calc(100vh-6.75rem)] overflow-y-auto hidden xl:block scrollbar-thin">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ListOrdered className="w-3.5 h-3.5" />
              <span>On this page</span>
            </div>
            <nav className="space-y-1.5">
              {currentPage.toc && currentPage.toc.length > 0 ? (
                currentPage.toc.map((item) => (
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
                    {item.title}
                  </a>
                ))
              ) : (
                <span className="text-xs text-muted-foreground/60 italic">
                  Overview
                </span>
              )}
            </nav>
          </div>
        </aside>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-lg bg-[#0d131f] border border-border/60 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation, guides, APIs..."
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
                        {res.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {res.tab}
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
                  No matching documentation pages found for "{searchQuery}".
                </div>
              ) : (
                <div className="p-4 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Popular Guides:</p>
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    <button
                      onClick={() => {
                        navigate('/docs/overview/welcome');
                        setSearchOpen(false);
                      }}
                      className="text-left p-1.5 rounded hover:bg-muted/30 text-xs text-primary"
                    >
                      Welcome to Anticeil
                    </button>
                    <button
                      onClick={() => {
                        navigate('/docs/agents/overview');
                        setSearchOpen(false);
                      }}
                      className="text-left p-1.5 rounded hover:bg-muted/30 text-xs text-primary"
                    >
                      AI Agents Overview
                    </button>
                    <button
                      onClick={() => {
                        navigate('/docs/flows/building-flows');
                        setSearchOpen(false);
                      }}
                      className="text-left p-1.5 rounded hover:bg-muted/30 text-xs text-primary"
                    >
                      Building Flows
                    </button>
                    <button
                      onClick={() => {
                        navigate('/docs/install/overview');
                        setSearchOpen(false);
                      }}
                      className="text-left p-1.5 rounded hover:bg-muted/30 text-xs text-primary"
                    >
                      Self-Hosting & Docker
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
