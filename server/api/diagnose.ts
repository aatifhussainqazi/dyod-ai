import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ChatHandler } from '../handlers/chatHandler';

let handlerInstance: ChatHandler | null = null;

function getHandler(): ChatHandler {
  if (!handlerInstance) {
    handlerInstance = new ChatHandler();
  }
  return handlerInstance;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query.q as string) || (req.query.query as string) || '';
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const chatHandler = getHandler();
    await chatHandler.initialize();
    const diagnostic = chatHandler.diagnose(query);
    return res.status(200).json(diagnostic);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Diagnostic failed' });
  }
}
