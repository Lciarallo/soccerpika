/**
 * POST /api/admin/upload — envia uma foto de produto para o Vercel Blob.
 *
 * Recebe o arquivo cru no corpo, com o nome em `?filename=`. Só admin, só
 * imagem, e o nome final é gerado aqui — o cliente não escolhe o caminho.
 */

import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, sendAuthError } from '../_lib/auth';

const MAX_BYTES = 8 * 1024 * 1024;

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const config = {
  api: {
    // O corpo chega como Buffer; sem isso o parser JSON tentaria interpretar.
    bodyParser: { sizeLimit: '8mb' },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    await requireAdmin(req);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: 'Upload indisponível: falta BLOB_READ_WRITE_TOKEN.',
      });
    }

    const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim();
    const ext = EXT[contentType];
    if (!ext) {
      return res.status(415).json({
        error: 'Formato não aceito. Envie JPG, PNG, WebP ou AVIF.',
      });
    }

    const body = req.body as Buffer | undefined;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return res.status(400).json({ error: 'Arquivo vazio.' });
    }
    if (body.length > MAX_BYTES) {
      return res.status(413).json({ error: 'Imagem maior que 8 MB.' });
    }

    // Nome gerado no servidor: nada do cliente entra no caminho do Blob.
    const blob = await put(`produtos/${randomUUID()}.${ext}`, body, {
      access: 'public',
      contentType,
    });

    return res.status(201).json({ url: blob.url });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    console.error('upload', error);
    return res.status(500).json({ error: 'Não foi possível enviar a imagem.' });
  }
}
