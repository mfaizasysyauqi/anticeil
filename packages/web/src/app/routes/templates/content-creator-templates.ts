import { Template, TemplateStatus, TemplateType } from '@activepieces/shared';

/**
 * Local Anticeil templates for Content Creator workflows.
 * Pinned at the top of the templates page — no cloud API needed.
 */

const makeAction = (
  name: string,
  displayName: string,
  pieceName: string,
  actionName: string,
  pieceVersion: string,
  nextAction?: any,
) => ({
  name,
  displayName,
  type: 'PIECE' as const,
  valid: true,
  skip: false,
  settings: {
    pieceName,
    actionName,
    pieceVersion,
    input: {},
    propertySettings: {},
    errorHandlingOptions: {
      retryOnFailure: { value: false },
      continueOnFailure: { value: false },
    },
  },
  nextAction,
});

/** Schedule trigger — shows clock icon in canvas */
const scheduleTrigger = (displayName = 'Every Hour') => ({
  name: 'trigger',
  type: 'PIECE_TRIGGER' as any,
  valid: true,
  displayName,
  settings: {
    pieceName: '@activepieces/piece-schedule',
    triggerName: 'every_hour',
    pieceVersion: '~0.1.22',
    input: {},
    propertySettings: {},
  },
});

export const CONTENT_CREATOR_TEMPLATES: Template[] = [
  {
    id: 'anticeil-yt-viral-clipper',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    name: 'YouTube Viral Clipper → Shorts',
    type: TemplateType.OFFICIAL,
    status: TemplateStatus.PUBLISHED,
    summary: 'Auto-detect viral moments from YouTube using Groq AI, clip them, and upload as Shorts.',
    description: 'Input a YouTube URL → Supadata fetches transcript → Groq scores segments (0-100 viral score) → top clips uploaded to YouTube Shorts → Telegram notification.',
    blogUrl: null,
    metadata: null,
    author: 'Anticeil',
    categories: ['Content Creator'],
    tags: [],
    pieces: [
      '@activepieces/piece-youtube',
      '@activepieces/piece-groq',
      '@activepieces/piece-telegram-bot',
    ],
    platformId: null,
    flows: [{
      displayName: 'YouTube Viral Clipper',
      valid: true,
      notes: [],
      schemaVersion: '8',
      agentIds: [],
      connectionIds: [],
      trigger: {
        ...scheduleTrigger('Receive YouTube URL'),
        nextAction: makeAction(
          'step_1', 'Upload to YouTube Shorts',
          '@activepieces/piece-youtube', 'upload_video', '~0.7.0',
          makeAction(
            'step_2', 'Score Viral Clips (Groq)',
            '@activepieces/piece-groq', 'ask-ai', '~0.4.0',
            makeAction(
              'step_3', 'Upload Short',
              '@activepieces/piece-youtube', 'upload_video', '~0.7.0',
              makeAction(
                'step_4', 'Send Telegram Alert',
                '@activepieces/piece-telegram-bot', 'send_text_message', '~0.7.0',
              ),
            ),
          ),
        ),
      },
    } as any],
  },
  {
    id: 'anticeil-content-brief-to-post',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    name: 'AI Content Brief → Multi-Platform Posts',
    type: TemplateType.OFFICIAL,
    status: TemplateStatus.PUBLISHED,
    summary: 'Turn a single brief into ready-to-publish posts for Instagram, TikTok, Twitter, and YouTube.',
    description: 'Input your content brief → Groq generates platform-specific copy → formatted posts for Instagram, TikTok, Twitter, and YouTube.',
    blogUrl: null,
    metadata: null,
    author: 'Anticeil',
    categories: ['Content Creator'],
    tags: [],
    pieces: [
      '@activepieces/piece-groq',
      '@activepieces/piece-telegram-bot',
    ],
    platformId: null,
    flows: [{
      displayName: 'Content Brief to Posts',
      valid: true,
      notes: [],
      schemaVersion: '8',
      agentIds: [],
      connectionIds: [],
      trigger: {
        ...scheduleTrigger('Receive Content Brief'),
        nextAction: makeAction(
          'step_1', 'Generate Captions (Groq)',
          '@activepieces/piece-groq', 'ask-ai', '~0.4.0',
          makeAction(
            'step_2', 'Send Posts via Telegram',
            '@activepieces/piece-telegram-bot', 'send_text_message', '~0.7.0',
          ),
        ),
      },
    } as any],
  },
  {
    id: 'anticeil-trending-monitor',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    name: 'Trending Topic Monitor & Alert',
    type: TemplateType.OFFICIAL,
    status: TemplateStatus.PUBLISHED,
    summary: 'Monitor YouTube trending topics hourly, score niche relevance with AI, get Telegram alerts.',
    description: 'Schedule → YouTube Trending API → Groq niche relevance scoring → filter score ≥ 80 → Telegram alert with video ideas.',
    blogUrl: null,
    metadata: null,
    author: 'Anticeil',
    categories: ['Content Creator'],
    tags: [],
    pieces: [
      '@activepieces/piece-youtube',
      '@activepieces/piece-groq',
      '@activepieces/piece-telegram-bot',
    ],
    platformId: null,
    flows: [{
      displayName: 'Trending Monitor',
      valid: true,
      notes: [],
      schemaVersion: '8',
      agentIds: [],
      connectionIds: [],
      trigger: {
        ...scheduleTrigger('Every Hour'),
        nextAction: makeAction(
          'step_1', 'Fetch Trending Videos',
          '@activepieces/piece-youtube', 'upload_video', '~0.7.0',
          makeAction(
            'step_2', 'Score Niche Relevance',
            '@activepieces/piece-groq', 'ask-ai', '~0.4.0',
            makeAction(
              'step_3', 'Send Telegram Alert',
              '@activepieces/piece-telegram-bot', 'send_text_message', '~0.7.0',
            ),
          ),
        ),
      },
    } as any],
  },
  {
    id: 'anticeil-caption-generator',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    name: 'Auto Caption & Hashtag Generator',
    type: TemplateType.OFFICIAL,
    status: TemplateStatus.PUBLISHED,
    summary: 'Send a video URL or script, get viral captions and 30 hashtags per platform instantly.',
    description: 'Webhook receives video URL or transcript → Groq generates 3 caption variants + hashtags for TikTok, Instagram Reels, and YouTube Shorts.',
    blogUrl: null,
    metadata: null,
    author: 'Anticeil',
    categories: ['Content Creator'],
    tags: [],
    pieces: [
      '@activepieces/piece-groq',
    ],
    platformId: null,
    flows: [{
      displayName: 'Caption Generator',
      valid: true,
      notes: [],
      schemaVersion: '8',
      agentIds: [],
      connectionIds: [],
      trigger: {
        ...scheduleTrigger('Receive Script/URL'),
        nextAction: makeAction(
          'step_1', 'Generate Captions & Hashtags',
          '@activepieces/piece-groq', 'ask-ai', '~0.4.0',
        ),
      },
    } as any],
  },
  {
    id: 'anticeil-content-reward-scraper',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    name: 'Content Reward Platform Scraper',
    type: TemplateType.OFFICIAL,
    status: TemplateStatus.PUBLISHED,
    summary: 'Pull videos from content reward platforms, filter by payout, queue for clipping automation.',
    description: 'Schedule → HTTP fetch reward platform → filter by min payout → store eligible videos → trigger Viral Clipper flow for each.',
    blogUrl: null,
    metadata: null,
    author: 'Anticeil',
    categories: ['Content Creator'],
    tags: [],
    pieces: [
      '@activepieces/piece-schedule',
      '@activepieces/piece-http',
      '@activepieces/piece-telegram-bot',
    ],
    platformId: null,
    flows: [{
      displayName: 'Content Reward Scraper',
      valid: true,
      notes: [],
      schemaVersion: '8',
      agentIds: [],
      connectionIds: [],
      trigger: {
        ...scheduleTrigger('Every Hour'),
        nextAction: makeAction(
          'step_1', 'Fetch Reward Platform',
          '@activepieces/piece-http', 'send_request', '~0.9.2',
          makeAction(
            'step_2', 'Notify via Telegram',
            '@activepieces/piece-telegram-bot', 'send_text_message', '~0.7.0',
          ),
        ),
      },
    } as any],
  },
];
