import { createAction, Property } from '@activepieces/pieces-framework';
import { chromium } from 'playwright';

export const scrapePageAction = createAction({
  name: 'scrape_page',
  displayName: 'Scrape Web Page',
  description: 'Navigate to any URL using headless Chromium, wait for content, and extract HTML or text.',
  props: {
    url: Property.ShortText({
      displayName: 'Page URL',
      description: 'The URL to navigate to.',
      required: true,
      defaultValue: 'https://example.com',
    }),
    waitForSelector: Property.ShortText({
      displayName: 'Wait for CSS Selector',
      description: 'Optional CSS selector to wait for before extracting content (e.g. "div.product-card").',
      required: false,
    }),
    timeoutSeconds: Property.Number({
      displayName: 'Timeout (Seconds)',
      description: 'Maximum time to wait for page load (default: 30).',
      required: false,
      defaultValue: 30,
    }),
  },
  async run(context) {
    const url = context.propsValue.url.trim();
    const waitForSelector = context.propsValue.waitForSelector?.trim();
    const timeout = (context.propsValue.timeoutSeconds || 30) * 1000;

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    try {
      const page = await browser.newPage({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {});
      }

      const title = await page.title();
      const pageUrl = page.url();
      const content = await page.content();
      const text = await page.innerText('body').catch(() => '');

      return {
        url: pageUrl,
        title,
        text: text.slice(0, 50000),
        html: content.slice(0, 100000),
      };
    } finally {
      await browser.close();
    }
  },
});
