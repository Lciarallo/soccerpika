/**
 * GET /api/account/profile — dados de checkout salvos (perfil + endereço padrão)
 * PUT /api/account/profile — salva nome, CPF, telefone e endereço padrão
 *
 * É o que faz o checkout rápido: com isso preenchido, a pessoa não redigita.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser, sendAuthError } from '../_lib/auth';
import { sql } from '../_lib/db';
import { normalizeCpf, OrderError, requireName } from '../_lib/order';

interface AddressRow {
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireUser(req);

    if (req.method === 'GET') {
      const [address] = await sql<AddressRow[]>`
        SELECT zip_code, street, number, complement, neighborhood, city, state
        FROM addresses WHERE user_id = ${user.id} AND is_default
      `;
      return res.status(200).json({
        profile: { name: user.name, email: user.email, cpf: user.cpf, phone: user.phone },
        address: address
          ? {
              zipCode: address.zip_code,
              street: address.street,
              number: address.number,
              complement: address.complement,
              neighborhood: address.neighborhood,
              city: address.city,
              state: address.state,
            }
          : null,
      });
    }

    if (req.method === 'PUT') {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = requireName(body.name, 'Nome');
      const cpf = body.cpf ? normalizeCpf(body.cpf) : null;
      const phone = body.phone ? String(body.phone).replace(/\D/g, '').slice(0, 13) : null;

      await sql`
        UPDATE users SET name = ${name}, cpf = ${cpf}, phone = ${phone}
        WHERE id = ${user.id}
      `;

      const a = (body.address ?? null) as Record<string, unknown> | null;
      if (a) {
        const zip = String(a.zipCode ?? '').replace(/\D/g, '');
        const state = String(a.state ?? '').toUpperCase().slice(0, 2);
        if (zip.length !== 8 || state.length !== 2) {
          throw new OrderError('CEP ou UF inválido.');
        }

        // Um endereço padrão por pessoa: substitui em vez de acumular.
        await sql.begin(async (tx) => {
          await tx`DELETE FROM addresses WHERE user_id = ${user.id} AND is_default`;
          await tx`
            INSERT INTO addresses
              (user_id, zip_code, street, number, complement, neighborhood, city, state, is_default)
            VALUES (
              ${user.id}, ${zip},
              ${String(a.street ?? '')}, ${String(a.number ?? '')},
              ${a.complement ? String(a.complement) : null},
              ${String(a.neighborhood ?? '')}, ${String(a.city ?? '')},
              ${state}, true
            )
          `;
        });
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    if (sendAuthError(res, error)) return;
    if (error instanceof OrderError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('profile', error);
    return res.status(500).json({ error: 'Não foi possível salvar o perfil.' });
  }
}
