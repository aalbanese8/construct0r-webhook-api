import { Request, Response } from 'express';
import * as scraperService from '../services/scraper.service.js';

export const scrapeWebPageHandler = async (req: Request, res: Response) => {
  try {
    const { url, useJavaScript } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await scraperService.scrapeWebPage(url, useJavaScript || false);
    return res.json({
      title: result.title,
      text: result.content,
      url: result.url,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Web scraping failed' });
  }
};
