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
} from './_lib/instagram.js';

const FALLBACK_POSTS = [
  {
    id: 'post-1',
    href: 'https://instagram.com/soccerpika',
    src: '/instagram/post-1.png',
    alt: 'Mantos pesados que acabaram de chegar no acervo!',
  },
  {
    id: 'post-2',
    href: 'https://instagram.com/soccerpika',
    src: '/instagram/post-2.png',
    alt: 'Detalhes que contam a história das grandes finais.',
  },
  {
    id: 'post-3',
    href: 'https://instagram.com/soccerpika',
    src: '/instagram/post-3.png',
    alt: 'Autenticidade conferida peça por peça.',
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const posts = await fetchInstagramPosts(instagramConfigFromEnv());
    res.setHeader(
      'Cache-Control',
      'public, max-age=300, s-maxage=900, stale-while-revalidate=86400',
    );
    return res.status(200).json({ posts });
  } catch (error) {
    if (error instanceof InstagramConfigError) {
      // Retorna fallback gracioso quando a chave da Meta não está configurada
      return res.status(200).json({ posts: FALLBACK_POSTS });
    }

    return res.status(200).json({
      posts: FALLBACK_POSTS,
    });
  }
}
