import { PieceAuth, createPiece, PieceCategory } from '@activepieces/pieces-framework';
import { scrapeShopeeAction } from './lib/actions/scrape-shopee';
import { generateVideoAction } from './lib/actions/generate-video';
import { scrapePageAction } from './lib/actions/scrape-page';

export const playwright = createPiece({
  displayName: 'Playwright',
  description: 'Automate web scraping, Shopee product extraction, and Google Flow (flow.google.com) AI video generation using Playwright Chromium.',
  minimumSupportedRelease: '0.9.0',
  logoUrl: '/playwright.png',
  categories: [PieceCategory.DEVELOPER_TOOLS],
  auth: PieceAuth.None(),
  actions: [
    scrapeShopeeAction,
    generateVideoAction,
    scrapePageAction,
  ],
  authors: ['mfaizasysyauqi'],
  triggers: [],
});
