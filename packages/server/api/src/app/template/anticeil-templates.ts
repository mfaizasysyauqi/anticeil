import {
  FlowActionType,
  FlowTriggerType,
  Template,
  TemplateStatus,
  TemplateType,
} from '@activepieces/shared';

export const ANTICEIL_YOUTUBE_AUTOMATION_TEMPLATE: Template = {
  id: 'tmpl_anticeil_yt_shopee_playwright',
  name: 'Shopee to YouTube AI Shorts Automation (Local Playwright)',
  summary:
    'Riset produk & gambar Shopee via Local Playwright Runner, buat prompt video & deskripsi pakai AI, generate video promosi, dan otomatis upload ke YouTube Shorts.',
  description:
    'Pipeline otomasi lengkap tanpa biaya browser cloud:\n1. Trigger harian / terjadwal.\n2. Local Playwright Browser Agent mencari produk trending & mengunduh gambar di Shopee.\n3. AI Copywriter (Gemini / OpenAI) membuat hook, visual prompt & deskripsi affiliasi.\n4. Local AI Video Generator merender video MP4.\n5. YouTube Piece otomatis mengunggah video ke channel YouTube lengkap dengan nomor produk & link affiliasi.',
  type: TemplateType.OFFICIAL,
  author: 'Anticeil',
  categories: ['E-Commerce', 'Content Creation', 'AI & Video Automation', 'Marketing'],
  tags: [
    { title: 'YouTube', color: '#FF0000' },
    { title: 'Playwright', color: '#2EAD33' },
    { title: 'Shopee', color: '#EE4D2D' },
    { title: 'AI Video', color: '#7C3AED' },
  ],
  pieces: [
    '@activepieces/piece-schedule',
    '@activepieces/piece-http',
    '@activepieces/piece-google-gemini',
    '@activepieces/piece-openai',
    '@activepieces/piece-youtube',
  ],
  blogUrl: null,
  metadata: null,
  platformId: null,
  status: TemplateStatus.PUBLISHED,
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  flows: [
    {
      displayName: 'Shopee to YouTube AI Shorts Pipeline',
      valid: true,
      notes: [],
      schemaVersion: '16',
      trigger: {
        name: 'trigger',
        displayName: 'Schedule Trigger',
        type: FlowTriggerType.PIECE,
        valid: true,
        lastUpdatedDate: new Date().toISOString(),
        settings: {
          pieceName: '@activepieces/piece-schedule',
          pieceVersion: '~0.1.0',
          triggerName: 'cron_expression',
          propertySettings: {},
          input: {
            cron_expression: '0 9 * * *',
          },
        },
        nextAction: {
          name: 'step_1_shopee_playwright',
          displayName: 'Scrape Shopee Products (Local Playwright)',
          type: FlowActionType.PIECE,
          valid: true,
          lastUpdatedDate: new Date().toISOString(),
          settings: {
            pieceName: '@activepieces/piece-http',
            pieceVersion: '~0.12.0',
            actionName: 'send_request',
            propertySettings: {},
            input: {
              method: 'POST',
              url: 'http://127.0.0.1:3001/api/shopee/search',
              headers: {
                'Content-Type': 'application/json',
              },
              body: {
                keyword: 'peralatan rumah tangga estetik',
                limit: 1,
              },
            },
          },
          nextAction: {
            name: 'step_2_ai_copywriter',
            displayName: 'Generate Promo Prompt & Caption (AI)',
            type: FlowActionType.PIECE,
            valid: true,
            lastUpdatedDate: new Date().toISOString(),
            settings: {
              pieceName: '@activepieces/piece-google-gemini',
              pieceVersion: '~0.2.0',
              actionName: 'generate_content',
              propertySettings: {},
              input: {
                prompt:
                  'Buatkan video script promosi pendek (15 detik) untuk YouTube Shorts berdasarkan produk Shopee berikut:\nJudul: {{step_1_shopee_playwright.body.products[0].title}}\nHarga: {{step_1_shopee_playwright.body.products[0].price}}\nLink: {{step_1_shopee_playwright.body.products[0].productUrl}}\n\nOutput dalam format JSON dengan key:\n1. video_prompt: deskripsi visual cinematic 9:16 untuk video generator\n2. yt_title: judul YouTube Shorts yang viral & mengundang klik (max 60 karakter)\n3. yt_description: caption lengkap, link Shopee, hashtag, dan info nomor produk.',
              },
            },
            nextAction: {
              name: 'step_3_generate_video',
              displayName: 'Generate Video MP4 (Local Playwright)',
              type: FlowActionType.PIECE,
              valid: true,
              lastUpdatedDate: new Date().toISOString(),
              settings: {
                pieceName: '@activepieces/piece-http',
                pieceVersion: '~0.12.0',
                actionName: 'send_request',
                propertySettings: {},
                input: {
                  method: 'POST',
                  url: 'http://127.0.0.1:3001/api/video/generate',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: {
                    prompt: '{{step_2_ai_copywriter.output}}',
                    imageUrl: '{{step_1_shopee_playwright.body.products[0].imageUrl}}',
                    durationSeconds: 15,
                  },
                },
              },
              nextAction: {
                name: 'step_4_upload_youtube',
                displayName: 'Upload to YouTube Shorts',
                type: FlowActionType.PIECE,
                valid: true,
                lastUpdatedDate: new Date().toISOString(),
                settings: {
                  pieceName: '@activepieces/piece-youtube',
                  pieceVersion: '~0.7.0',
                  actionName: 'custom_api_call',
                  propertySettings: {},
                  input: {
                    url: '/videos',
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: {
                      snippet: {
                        title: '{{step_2_ai_copywriter.output.yt_title}} #Shorts',
                        description: '{{step_2_ai_copywriter.output.yt_description}}',
                        categoryId: '22',
                      },
                      status: {
                        privacyStatus: 'public',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  ],
};

export const ALL_ANTICEIL_TEMPLATES: Template[] = [
  ANTICEIL_YOUTUBE_AUTOMATION_TEMPLATE,
];
