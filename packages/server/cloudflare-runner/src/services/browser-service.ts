import { Env } from '../types';

export class BrowserService {
  constructor(private env: Env) {}

  /**
   * Scrapes or automates web page actions via Cloudflare Browser Rendering
   */
  async scrapeUrl({
    url,
    waitForSelector,
    extractSelector,
    screenshot = false,
  }: {
    url: string;
    waitForSelector?: string;
    extractSelector?: string;
    screenshot?: boolean;
  }): Promise<{ content?: string; screenshotBase64?: string; title?: string }> {
    // Dynamic import to prevent build failure if module is loaded at runtime in Workers environment
    const puppeteer = await import('@cloudflare/puppeteer').catch(() => null);
    if (!puppeteer) {
      throw new Error('@cloudflare/puppeteer binding is not available in current environment');
    }

    const browser = await puppeteer.default.launch(this.env.MY_BROWSER as any);
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 15000 });
      }

      const title = await page.title();
      let content: string | undefined;

      if (extractSelector) {
        content = await page.$eval(extractSelector, (el: { textContent?: string | null }) => el.textContent || '');
      } else {
        content = await page.content();
      }

      let screenshotBase64: string | undefined;
      if (screenshot) {
        const buffer = await page.screenshot({ encoding: 'base64' });
        screenshotBase64 = buffer as string;
      }

      return { title, content, screenshotBase64 };
    } finally {
      await browser.close();
    }
  }
}
