import { Request, Response } from 'express';
import * as openaiService from '../services/openai.service.js';

export const chatCompletionHandler = async (req: Request, res: Response) => {
  try {
    const { message, history, contextSources, systemInstruction } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await openaiService.generateChatResponse(
      message,
      history || [],
      contextSources || [],
      systemInstruction
    );

    return res.json({ response });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Chat completion failed' });
  }
};
