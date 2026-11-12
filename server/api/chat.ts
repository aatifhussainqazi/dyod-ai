import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import path from 'path';
import { ChatHandler } from '../handlers/chatHandler';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let handlerInstance: ChatHandler | null = null;

function getHandler(): ChatHandler {
  if (!handlerInstance) {
    handlerInstance = new ChatHandler();
  }
  return handlerInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      answer: 'Method Not Allowed. Use POST.',
      citations: [],
      provider: 'system',
      grounded: false,
    });
  }

  try {
    const chatHandler = getHandler();
    const clientIp =
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const result = await chatHandler.handleChat(req.body, clientIp);
    return res.status(result.statusCode).json(result.response);
  } catch (err: any) {
    console.error('Unhandled API error in /api/chat:', err);
    return res.status(500).json({
      status: 'error',
      answer: 'Internal server error occurred.',
      citations: [],
      provider: 'system',
      grounded: false,
    });
  }
}
