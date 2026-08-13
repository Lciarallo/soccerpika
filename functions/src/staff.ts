import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { auth, db, requireAdmin, requireAuth } from './auth.js';

export const setAdminRole = onCall({ cors: true }, async (request: CallableRequest) => {
  // Se ainda não houver nenhum admin no sistema ou for chamado por um admin existente
  const { email, uid } = request.data ?? {};

  let targetUid = uid;
  if (!targetUid && email) {
    const userRecord = await auth.getUserByEmail(email);
    targetUid = userRecord.uid;
  }

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'UID ou e-mail do usuário não fornecido.');
  }

  // Verifica se quem chamou é admin, exceto se configurando a primeira conta com bootstrap secret
  const bootstrapSecret = request.data?.bootstrapSecret;
  const isBootstrap = bootstrapSecret && bootstrapSecret === process.env.ADMIN_BOOTSTRAP_SECRET;

  if (!isBootstrap) {
    requireAdmin(request);
  }

  await auth.setCustomUserClaims(targetUid, { admin: true });
  await db.collection('users').doc(targetUid).set(
    {
      role: 'admin',
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return { ok: true, targetUid, role: 'admin' };
});

export const getCustomerOrders = onCall({ cors: true }, async (request: CallableRequest) => {
  const uid = requireAuth(request);

  const ordersSnap = await db
    .collection('orders')
    .where('userId', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const orders = ordersSnap.docs.map((doc) => doc.data());
  return { orders };
});
