import { onCall } from 'firebase-functions/v2/https';
import { db } from './auth.js';

export interface InstagramPost {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp?: string;
}

const FALLBACK_POSTS: InstagramPost[] = [
  {
    id: 'post-1',
    caption: 'Mantos pesados que acabaram de chegar no acervo! 🔥⚽️ #soccerpika #camisasdefutebol',
    media_type: 'IMAGE',
    media_url: '/instagram/post-1.png',
    permalink: 'https://instagram.com/soccerpika',
  },
  {
    id: 'post-2',
    caption: 'Detalhes que contam a história das grandes finais. 🏆 #matchworn #camisadejogo',
    media_type: 'IMAGE',
    media_url: '/instagram/post-2.png',
    permalink: 'https://instagram.com/soccerpika',
  },
  {
    id: 'post-3',
    caption: 'Autenticidade conferida peça por peça. Garanta o seu manto exclusivo. 📦',
    media_type: 'IMAGE',
    media_url: '/instagram/post-3.png',
    permalink: 'https://instagram.com/soccerpika',
  },
];

export const getInstagramFeed = onCall({ cors: true }, async () => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!token || !userId) {
    return { posts: FALLBACK_POSTS, source: 'fallback' };
  }

  // Verifica cache no Firestore
  const cacheRef = db.collection('system').doc('instagram_cache');
  const cacheSnap = await cacheRef.get();

  if (cacheSnap.exists) {
    const data = cacheSnap.data();
    const ageInMinutes = (Date.now() - (data?.updatedAtMs || 0)) / (1000 * 60);
    if (ageInMinutes < 60 && Array.isArray(data?.posts) && data.posts.length > 0) {
      return { posts: data.posts, source: 'cache' };
    }
  }

  try {
    const version = process.env.INSTAGRAM_GRAPH_API_VERSION || 'v22.0';
    const url = `https://graph.instagram.com/${version}/${userId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${token}&limit=6`;
    
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) {
      throw new Error(`Instagram API returned ${resp.status}`);
    }

    const json = (await resp.json()) as { data?: InstagramPost[] };
    const posts = json.data && json.data.length > 0 ? json.data : FALLBACK_POSTS;

    await cacheRef.set({
      posts,
      updatedAtMs: Date.now(),
      updatedAt: new Date().toISOString(),
    });

    return { posts, source: 'live' };
  } catch (error) {
    console.warn('Erro ao consultar Instagram Graph API, usando cache/fallback:', error);
    if (cacheSnap.exists && cacheSnap.data()?.posts) {
      return { posts: cacheSnap.data()?.posts, source: 'stale_cache' };
    }
    return { posts: FALLBACK_POSTS, source: 'fallback' };
  }
});
