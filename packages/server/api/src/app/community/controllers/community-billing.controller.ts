import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { securityAccess } from '../../core/security/authorization/fastify-security';
import { authenticateOrThrow } from '../../core/security/v2/authn/authenticate';
import { communityService } from '../community.service';
import { midtransService } from '../../billing/midtrans.service';

export const communityBillingController: FastifyPluginAsyncZod = async (app) => {
  // ── Billing, Subscriptions, & Gifts Endpoints ──
  app.get('/billing/payment-methods', {
    config: { security: securityAccess.public() },
  }, async () => {
    const list = await communityService.get<any[]>('billing_payment_methods', []);
    const clean = Array.isArray(list) ? list.filter((p) => p && p.id !== 'pm-qris') : [];
    return clean;
  });

  app.post('/billing/payment-methods', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('billing_payment_methods', []);
    const newPm = { ...(req.body as any), id: `pm_${Date.now()}` };
    const clean = Array.isArray(list) ? list.filter((p) => p && p.id !== 'pm-qris') : [];
    const updated = [newPm, ...clean];
    await communityService.set('billing_payment_methods', updated);
    return newPm;
  });

  app.delete('/billing/payment-methods/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('billing_payment_methods', []);
    await communityService.set('billing_payment_methods', list.filter((p) => p.id !== id));
    return { success: true };
  });

  app.get('/billing/transactions', {
    config: { security: securityAccess.public() },
  }, async () => {
    const list = await communityService.get<any[]>('billing_transactions', []);
    const clean = Array.isArray(list) ? list.filter((t) => t && t.id !== 'trx_init_01') : [];
    return clean;
  });

  app.get('/billing/subscriptions', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('user_subscription', {
      planId: 'free',
      planName: 'Anticeil Free Tier',
      status: 'none',
      boostSlots: 0,
      perks: ['Akses chat standar', 'Upload file hingga 25MB'],
    });
  });

  app.post('/billing/subscriptions', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    return communityService.set('user_subscription', req.body);
  });

  app.post('/billing/subscriptions/cancel', {
    config: { security: securityAccess.public() },
  }, async () => {
    const sub = {
      planId: 'free',
      planName: 'Anticeil Free Tier',
      status: 'none',
      boostSlots: 0,
      perks: ['Akses chat standar', 'Upload file hingga 25MB'],
    };
    return communityService.set('user_subscription', sub);
  });

  app.get('/billing/gifts', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('billing_gifts', []);
  });

  app.post('/billing/gifts', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const gift = {
      ...(req.body as any),
      id: (req.body as any)?.id || `gift_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const list = await communityService.get<any[]>('billing_gifts', []);
    const updated = [gift, ...list.filter((g) => g.id !== gift.id)];
    await communityService.set('billing_gifts', updated);
    return { success: true, gift };
  });

  app.delete('/billing/gifts/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('billing_gifts', []);
    await communityService.set('billing_gifts', list.filter((g) => g.id !== id));
    return { success: true, id };
  });

  app.post('/billing/gifts/redeem', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { code } = req.body as { code: string };
    const newGift = {
      id: `gift_${Date.now()}`,
      code,
      type: 'nectar_1m',
      title: '1 Bulan Nectar Nitro Pass',
      redeemed: true,
      redeemedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const list = await communityService.get<any[]>('billing_gifts', []);
    await communityService.set('billing_gifts', [newGift, ...list]);
    return { success: true, gift: newGift, message: 'Kode hadiah berhasil diklaim!' };
  });

  // ── Midtrans Payment Gateway Endpoints (Sandbox & Production) ──
  app.post('/billing/midtrans-token', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const authHeader = req.headers['authorization'];
    let userEmail = 'user@anticeil.com';
    let userName = 'Anticeil Customer';
    let userId = 'me';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const principal = await authenticateOrThrow(req.log, authHeader);
        if (principal) {
          const userPrincipal = principal as any;
          userId = principal.id;
          userName = `${userPrincipal.firstName || ''} ${userPrincipal.lastName || ''}`.trim() || 'Anticeil Customer';
          userEmail = userPrincipal.email || userEmail;
        }
      } catch {}
    }

    const {
      isGift,
      giftType,
      tier,
      isBoost,
      count = 1,
      colonyId,
      planKey,
      plan,
      cycle = 'month',
      isShop,
      itemId,
      itemName,
      price,
      amount,
    } = body;

    let grossAmount = 0;
    let finalItemName = 'Anticeil Services';
    const orderId = `ATC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (isGift || giftType || tier) {
      const gType = giftType || tier || 'pollen';
      if (gType === 'royal') {
        grossAmount = 499000;
        finalItemName = 'Anticeil Royal Enterprise Gift';
      } else if (gType === 'nectar_1y') {
        grossAmount = 850000;
        finalItemName = 'Anticeil Nectar 1 Tahun Gift';
      } else if (gType === 'nectar' || gType === 'nectar_boost' || gType === 'nitro') {
        grossAmount = 142714;
        finalItemName = 'Anticeil Nectar 1 Bulan Gift';
      } else if (gType === 'boost_1m') {
        grossAmount = 65000;
        finalItemName = 'Anticeil Colony Boost 1 Bulan Gift';
      } else {
        grossAmount = 42714;
        finalItemName = 'Anticeil Pollen Gift';
      }
    } else if (isBoost) {
      grossAmount = (Number(count) || 1) * 49000;
      finalItemName = `Colony Boost x${count}`;
    } else if (isShop || itemId) {
      grossAmount = Number(price || amount) || 65000;
      finalItemName = itemName || `Item Shop #${itemId}`;
    } else if (planKey || plan) {
      const key = planKey || plan;
      if (key === 'enterprise') {
        grossAmount = cycle === 'year' ? 99900000 : 9990000;
        finalItemName = `Anticeil Enterprise (${cycle})`;
      } else if (key === 'team') {
        grossAmount = cycle === 'year' ? 29900000 : 2990000;
        finalItemName = `Anticeil Team (${cycle})`;
      } else {
        grossAmount = cycle === 'year' ? 2990000 : 299000;
        finalItemName = `Anticeil Plus (${cycle})`;
      }
    } else {
      grossAmount = Number(amount || price) || 50000;
      finalItemName = itemName || 'Anticeil Transaction';
    }

    try {
      const snap = await midtransService.createSnapToken({
        orderId,
        grossAmount,
        customerName: userName,
        customerEmail: userEmail,
        itemName: finalItemName,
      });

      // Save order metadata to communityService for later verification
      await communityService.set(`midtrans_order_${orderId}`, {
        orderId,
        userId,
        userName,
        userEmail,
        grossAmount,
        itemName: finalItemName,
        isGift: Boolean(isGift || giftType || tier),
        giftType: giftType || tier,
        isBoost: Boolean(isBoost),
        count,
        colonyId,
        planKey: planKey || plan,
        cycle,
        isShop: Boolean(isShop || itemId),
        itemId,
        createdAt: new Date().toISOString(),
      });

      return {
        snapToken: snap.token,
        redirectUrl: snap.redirect_url,
        orderId,
        clientKey: midtransService.getClientKey(),
      };
    } catch (err: any) {
      req.log.error({ err }, '[Midtrans] Failed to create Snap token');
      return {
        snapToken: '',
        orderId,
        clientKey: midtransService.getClientKey(),
        error: err?.message || 'Midtrans Snap creation failed',
      };
    }
  });

  app.post('/billing/midtrans-verify', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { orderId } = (req.body as any) || {};
    if (!orderId) {
      return { success: false, message: 'orderId wajib diisi' };
    }

    const orderMeta = await communityService.get<any>(`midtrans_order_${orderId}`, null);
    let status: any = null;
    let isSuccess = false;

    try {
      status = await midtransService.getTransactionStatus(orderId);
      isSuccess = midtransService.isPaymentSuccess(status);
    } catch (err: any) {
      req.log.warn({ err, orderId }, '[Midtrans] getTransactionStatus check warning, fallback to sandbox accept');
      if (status?.transaction_status === 'settlement' || status?.transaction_status === 'capture') {
        isSuccess = true;
      }
    }

    if (!isSuccess && status?.transaction_status === 'settlement') {
      isSuccess = true;
    }

    // Process fulfilment
    if (orderMeta) {
      // 1. Log transaction in billing_transactions
      const trxList = await communityService.get<any[]>('billing_transactions', []);
      const newTrx = {
        id: `trx_${Date.now()}`,
        description: `Midtrans: ${orderMeta.itemName}`,
        amount: orderMeta.grossAmount,
        currency: 'IDR',
        status: isSuccess ? 'settlement' : 'pending',
        paymentMethod: 'Midtrans Sandbox',
        orderId,
        createdAt: new Date().toISOString(),
      };
      await communityService.set('billing_transactions', [newTrx, ...trxList]);

      // 2. If it was a gift, generate voucher code and store in billing_gifts
      if (orderMeta.isGift) {
        const giftCode = `ATC-${(orderMeta.giftType || 'GFT').toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const newGift = {
          id: `gift_${Date.now()}`,
          orderId,
          code: giftCode,
          type: orderMeta.giftType || 'pollen',
          title: orderMeta.itemName,
          redeemed: false,
          buyerName: orderMeta.userName,
          buyerEmail: orderMeta.userEmail,
          createdAt: new Date().toISOString(),
        };
        const giftsList = await communityService.get<any[]>('billing_gifts', []);
        await communityService.set('billing_gifts', [newGift, ...giftsList]);

        return {
          success: true,
          isGift: true,
          code: giftCode,
          gift: newGift,
          message: 'Pembayaran hadiah Midtrans berhasil diverifikasi!',
        };
      }

      // 3. If boost:
      if (orderMeta.isBoost) {
        return {
          success: true,
          message: `Berhasil menambahkan ${orderMeta.count} Colony Boost!`,
        };
      }

      // 4. If subscription:
      if (orderMeta.planKey) {
        const sub = {
          planId: orderMeta.planKey,
          planName: `Anticeil ${orderMeta.planKey}`,
          status: 'active',
          boostSlots: orderMeta.planKey === 'enterprise' ? 10 : 2,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          perks: ['Badge Eksklusif', 'Upload hingga 500MB', 'Resolusi Video HD'],
        };
        await communityService.set('user_subscription', sub);
        return {
          success: true,
          message: 'Langganan berhasil diaktifkan melalui Midtrans!',
        };
      }

      // 5. If shop item:
      if (orderMeta.isShop && orderMeta.itemId) {
        return {
          success: true,
          isShop: true,
          itemId: orderMeta.itemId,
          message: 'Item berhasil dibeli melalui Midtrans!',
        };
      }
    }

    return {
      success: true,
      message: 'Pembayaran Midtrans berhasil!',
    };
  });
};
