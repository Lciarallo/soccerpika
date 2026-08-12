/**
 * GET /api/instagram — últimos posts públicos da conta profissional.
 *
 * O token da Meta fica exclusivamente no ambiente desta Function. A resposta
 * contém apenas URLs públicas de posts/imagens já validadas.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  fetchInstagramPosts,
  instagramConfigFromEnv,
  InstagramConfigError,
  InstagramUpstreamError,
} from './_lib/instagram.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  if (Object.keys(req.query).length > 0) {
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(400).json({ error: 'Parâmetros não são aceitos nesta rota.' });
  }

  try {
    const posts = await fetchInstagramPosts(instagramConfigFromEnv());
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, s-maxage=900, stale-while-revalidate=86400',
    );
    return res.status(200).json({ posts });
  } catch (error) {
    res.setHeader('Cache-Control', 'private, no-store');

    if (error instanceof InstagramConfigError) {
      console.error('instagram-feed: configuração ausente ou inválida');
      return res.status(503).json({
        error: 'Feed do Instagram temporariamente indisponível.',
        posts: [],
      });
    }

    if (error instanceof InstagramUpstreamError) {
      console.error(`instagram-feed: Meta respondeu ${error.status}`);
    } else {
      console.error('instagram-feed: falha ao consultar a Meta');
    }

    return res.status(502).json({
      error: 'Feed do Instagram temporariamente indisponível.',
      posts: [],
    });
  }
}
