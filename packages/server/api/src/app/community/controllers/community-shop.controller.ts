import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { securityAccess } from '../../core/security/authorization/fastify-security';
import { communityService } from '../community.service';

export const communityShopController: FastifyPluginAsyncZod = async (app) => {
  // ── Anticeil Native Animated Cosmetics Shop (Fullstack Database) ──────
  const INITIAL_SHOP_ITEMS = [
    // 1. Anticeil Cyber Core (Animated Frames, Overlays & Namecards)
    {
      id: 'shop_cyber_void_frame',
      name: 'Cyber Void Frame (Animated)',
      collection: 'Anticeil Cyber Core',
      category: 'avatar_decoration',
      description: 'Bingkai avatar animasi GIF dengan cincin sirkuit neon cybernetic berputar dan denyut hologram biru sian.',
      priceIdr: 65000,
      priceDew: 500,
      priceOrbs: 500,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eHN3YWRjM2I3bm8zdXFpdjB6Ym05OG5hbjN4MnExMmt6dWg3MyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/xT0xeJpnrWC4XWblEk/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eHN3YWRjM2I3bm8zdXFpdjB6Ym05OG5hbjN4MnExMmt6dWg3MyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/xT0xeJpnrWC4XWblEk/giphy.gif',
      badge: 'Animasi Baru',
      featured: true,
    },
    {
      id: 'shop_hex_matrix_nameplate',
      name: 'Hex Matrix Namecard (Animated)',
      collection: 'Anticeil Cyber Core',
      category: 'nameplate',
      description: 'Namecard strip animasi GIF dengan aliran gelombang kode sarang lebah futuristik di samping nama profil.',
      priceIdr: 45000,
      priceDew: 350,
      priceOrbs: 350,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ29va3Q1OXdtcXV5Ymg2cTdpYTV1eHBjcjdpZGk4N3Uzb3lsZ3NqaiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26tn33aiTi1jkl6H6/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ29va3Q1OXdtcXV5Ymg2cTdpYTV1eHBjcjdpZGk4N3Uzb3lsZ3NqaiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26tn33aiTi1jkl6H6/giphy.gif',
      badge: 'Official',
      featured: false,
    },
    {
      id: 'shop_cyber_stream_overlay',
      name: 'Cyber Stream Overlay (Animated)',
      collection: 'Anticeil Cyber Core',
      category: 'profile_effect',
      description: 'Overlay efek kartu profil animasi GIF dengan hujan kode biner digital dan partikel glitch hologram berkilau.',
      priceIdr: 85000,
      priceDew: 650,
      priceOrbs: 650,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ29va3Q1OXdtcXV5Ymg2cTdpYTV1eHBjcjdpZGk4N3Uzb3lsZ3NqaiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26tn33aiTi1jkl6H6/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ29va3Q1OXdtcXV5Ymg2cTdpYTV1eHBjcjdpZGk4N3Uzb3lsZ3NqaiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26tn33aiTi1jkl6H6/giphy.gif',
      badge: 'Hot Effect',
      featured: true,
    },
    {
      id: 'shop_anticeil_cyber_bundle',
      name: 'Anticeil Cybernetic Core Bundle (3pc Animated)',
      collection: 'Anticeil Cyber Core',
      category: 'bundle',
      description: 'Paket bundel lengkap: Bingkai Cyber Void, Overlay Matrix Stream, dan Hex Matrix Namecard.',
      priceIdr: 140000,
      priceDew: 1000,
      priceOrbs: 1000,
      discountPercent: 30,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eHN3YWRjM2I3bm8zdXFpdjB6Ym05OG5hbjN4MnExMmt6dWg3MyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/xT0xeJpnrWC4XWblEk/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1eHN3YWRjM2I3bm8zdXFpdjB6Ym05OG5hbjN4MnExMmt6dWg3MyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/xT0xeJpnrWC4XWblEk/giphy.gif',
      badge: 'Bundel Populer',
      itemTypes: ['avatar_decoration', 'profile_effect', 'nameplate'],
      featured: true,
    },

    // 2. Starlight Cosmic Collection (Animated Celestial)
    {
      id: 'shop_celestial_halo',
      name: 'Celestial Starlight Halo (Animated)',
      collection: 'Starlight Cosmic',
      category: 'avatar_decoration',
      description: 'Bingkai avatar animasi GIF lingkaran bintang emas berkilau dan partikel debu kosmik berotasi halus.',
      priceIdr: 65000,
      priceDew: 500,
      priceOrbs: 500,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      badge: 'Kosmik',
      featured: true,
    },
    {
      id: 'shop_starlight_namecard',
      name: 'Starlight Shimmer Namecard (Animated)',
      collection: 'Starlight Cosmic',
      category: 'nameplate',
      description: 'Namecard strip animasi GIF dengan pancaran pendar kilau konstelasi bintang dan pita nebula emas.',
      priceIdr: 45000,
      priceDew: 350,
      priceOrbs: 350,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      badge: 'Hot',
      featured: false,
    },
    {
      id: 'shop_aurora_glow_overlay',
      name: 'Aurora Borealis Spectrum Overlay (Animated)',
      collection: 'Starlight Cosmic',
      category: 'profile_effect',
      description: 'Overlay animasi GIF tirai cahaya polar aurora hijau zamrud dan violet menari anggun di atas kartu profil.',
      priceIdr: 85000,
      priceDew: 650,
      priceOrbs: 650,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazl5MGI5OTU3a2Z2OXV6ZG42NTRhMW1rNmhrNWw3MWk2M29wb2psciZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7bu3XilJ5BOiSGic/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazl5MGI5OTU3a2Z2OXV6ZG42NTRhMW1rNmhrNWw3MWk2M29wb2psciZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7bu3XilJ5BOiSGic/giphy.gif',
      badge: 'Unggulan',
      featured: true,
    },
    {
      id: 'shop_anticeil_cosmic_bundle',
      name: 'Starlight Cosmic Odyssey Bundle (3pc Animated)',
      collection: 'Starlight Cosmic',
      category: 'bundle',
      description: 'Paket bundel kosmik lengkap: Bingkai Celestial Halo, Overlay Aurora Borealis, dan Starlight Namecard.',
      priceIdr: 150000,
      priceDew: 1100,
      priceOrbs: 1100,
      discountPercent: 25,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJqNDd4OWI0dHFtdHhzM2VpdGlnZmdkMmp4cGhyanE4NHo1MHN6YiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKSjRrfIPjeiVyM/giphy.gif',
      badge: 'Unggulan',
      itemTypes: ['avatar_decoration', 'profile_effect', 'nameplate'],
      featured: true,
    },

    // 3. Nature & Zen Collection
    {
      id: 'shop_zen_sakura_frame',
      name: 'Zen Sakura Petals Frame (Animated)',
      collection: 'Nature & Zen',
      category: 'avatar_decoration',
      description: 'Bingkai avatar animasi GIF kelopak bunga sakura merah muda berputar melingkar lembut di sekeliling avatar.',
      priceIdr: 65000,
      priceDew: 500,
      priceOrbs: 500,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3N2c2J3YnpsdzJjcXl0OTk5OHZ4NW9wbjl6MWs1bnlsOXpmdG9zOSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/l0MYt5jPR6QX5pnqM/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3N2c2J3YnpsdzJjcXl0OTk5OHZ4NW9wbjl6MWs1bnlsOXpmdG9zOSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/l0MYt5jPR6QX5pnqM/giphy.gif',
      badge: 'Favorit',
      featured: false,
    },
    {
      id: 'shop_fireflies_overlay',
      name: 'Golden Fireflies Field Overlay (Animated)',
      collection: 'Nature & Zen',
      category: 'profile_effect',
      description: 'Overlay animasi GIF kawanan kunang-kunang keemasan melayang lembut di malam hari menutupi kartu profil.',
      priceIdr: 85000,
      priceDew: 650,
      priceOrbs: 650,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczU3bDN6OXpxeHN3bzI4eWprOWp6cTFscXFkZTBwbzE0bmk4d3JkOSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26BRzozg4TCBXv6QU/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczU3bDN6OXpxeHN3bzI4eWprOWp6cTFscXFkZTBwbzE0bmk4d3JkOSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/26BRzozg4TCBXv6QU/giphy.gif',
      badge: 'Estetik',
      featured: false,
    },

    // 4. Inferno & Void Collection
    {
      id: 'shop_inferno_flame_frame',
      name: 'Inferno Flame Ring (Animated)',
      collection: 'Inferno & Void',
      category: 'avatar_decoration',
      description: 'Bingkai avatar animasi GIF kobaran api membara melingkari foto profil dengan percikan bara menyala.',
      priceIdr: 65000,
      priceDew: 500,
      priceOrbs: 500,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjA3YWRmYTVjOGMzMjdhZjhhMmM3ZjcyOGRhZjU2MzExMWJmZWI2MSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKtnuHOHHUjR38Y/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjA3YWRmYTVjOGMzMjdhZjhhMmM3ZjcyOGRhZjU2MzExMWJmZWI2MSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3o7TKtnuHOHHUjR38Y/giphy.gif',
      badge: 'Intens',
      featured: true,
    },
    {
      id: 'shop_crimson_scratch_namecard',
      name: 'Crimson Scratch Glitch Namecard (Animated)',
      collection: 'Inferno & Void',
      category: 'nameplate',
      description: 'Namecard strip animasi GIF garis cakar merah darah dan denyut glitch crimson intens.',
      priceIdr: 45000,
      priceDew: 350,
      priceOrbs: 350,
      gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGgyaW05bWJqOWt0aXFzZG12dXB2ZHE5YWRqdGF1MnlqNHU1Mms4ZiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3oKIPnAiaMCws8nOsE/giphy.gif',
      previewIcon: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGgyaW05bWJqOWt0aXFzZG12dXB2ZHE5YWRqdGF1MnlqNHU1Mms4ZiZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/3oKIPnAiaMCws8nOsE/giphy.gif',
      badge: 'Dark',
      featured: false,
    },
  ];

  const sanitizeShopItems = (items: any[]) => {
    if (!Array.isArray(items)) return INITIAL_SHOP_ITEMS;
    const filtered = items.filter((i) =>
      i &&
      i.collection !== 'Zenless Zone Zero' &&
      i.collection !== 'Deadpool & Wolverine' &&
      i.collection !== 'Dead by Daylight' &&
      !String(i.name || '').includes('Miyabi') &&
      !String(i.name || '').includes('Ellen Joe') &&
      !String(i.name || '').includes('Burnice') &&
      !String(i.name || '').includes('Deadpool') &&
      !String(i.name || '').includes('Wolverine') &&
      !String(i.name || '').includes('Trapper')
    );
    return filtered.length > 0 ? filtered : INITIAL_SHOP_ITEMS;
  };

  app.get('/community/shop/items', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const query = (req.query as any) || {};
    const cat = (query.category || '').toLowerCase().trim();
    const col = (query.collection || '').toLowerCase().trim();
    const q = (query.q || '').toLowerCase().trim();

    const rawStored = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const storedItems = sanitizeShopItems(rawStored);
    if (storedItems.length !== rawStored?.length) {
      await communityService.set('community_shop_items', storedItems);
    }

    let filtered = [...storedItems];

    if (cat && cat !== 'all') {
      filtered = filtered.filter((it) => it.category?.toLowerCase() === cat);
    }
    if (col && col !== 'all') {
      filtered = filtered.filter((it) => it.collection?.toLowerCase() === col);
    }
    if (q) {
      filtered = filtered.filter(
        (it) =>
          it.name?.toLowerCase().includes(q) ||
          it.description?.toLowerCase().includes(q) ||
          it.collection?.toLowerCase().includes(q)
      );
    }
    return filtered;
  });

  app.post('/community/shop/items', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const allowDew = body.allowDew !== undefined ? Boolean(body.allowDew) : true;
    const newItem = {
      id: body.id || `shop_custom_${Date.now()}`,
      name: body.name || 'Custom Product',
      collection: body.collection || 'Anticeil Custom',
      category: body.category || 'avatar_decoration',
      description: body.description || 'Eksklusif dibuat oleh komunitas.',
      allowDew,
      priceIdr: Number(body.priceIdr) || 78000,
      priceDew: allowDew ? (Number(body.priceDew) || Number(body.priceOrbs) || 600) : 0,
      priceOrbs: allowDew ? (Number(body.priceDew) || Number(body.priceOrbs) || 600) : 0,
      discountPercent: body.discountPercent ? Number(body.discountPercent) : undefined,
      bannerUrl: body.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      previewIcon: body.previewIcon || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80',
      badge: body.badge || 'Baru',
      featured: Boolean(body.featured),
      createdAt: new Date().toISOString(),
    };

    const rawStored = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const storedItems = sanitizeShopItems(rawStored);
    const updated = [newItem, ...storedItems];
    await communityService.set('community_shop_items', updated);

    return {
      success: true,
      message: 'Item berhasil ditambahkan ke katalog Shop!',
      item: newItem,
      items: updated,
    };
  });

  app.delete('/community/shop/items/:itemId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { itemId } = (req.params as any) || {};
    const rawStored = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const storedItems = sanitizeShopItems(rawStored);
    const updated = storedItems.filter((i) => i.id !== itemId);
    await communityService.set('community_shop_items', updated);

    return {
      success: true,
      message: 'Item berhasil dihapus dari katalog Shop!',
      deletedId: itemId,
    };
  });

  app.put('/community/shop/items/:itemId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { itemId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const rawStored = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const storedItems = sanitizeShopItems(rawStored);
    const index = storedItems.findIndex((i) => i.id === itemId);
    if (index === -1) {
      return { success: false, message: 'Item tidak ditemukan di Shop.' };
    }
    const allowDew = body.allowDew !== undefined ? Boolean(body.allowDew) : (storedItems[index].allowDew !== undefined ? storedItems[index].allowDew : true);
    const updatedItem = {
      ...storedItems[index],
      ...body,
      id: itemId,
      allowDew,
      priceIdr: body.priceIdr !== undefined ? Number(body.priceIdr) : storedItems[index].priceIdr,
      priceDew: allowDew ? (body.priceDew !== undefined ? Number(body.priceDew) : (body.priceOrbs !== undefined ? Number(body.priceOrbs) : storedItems[index].priceDew)) : 0,
      priceOrbs: allowDew ? (body.priceDew !== undefined ? Number(body.priceDew) : (body.priceOrbs !== undefined ? Number(body.priceOrbs) : storedItems[index].priceOrbs)) : 0,
    };
    storedItems[index] = updatedItem;
    await communityService.set('community_shop_items', storedItems);
    return {
      success: true,
      message: 'Item berhasil diperbarui!',
      item: updatedItem,
    };
  });

  app.get('/community/shop/featured', {
    config: { security: securityAccess.public() },
  }, async () => {
    const rawStored = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const storedItems = sanitizeShopItems(rawStored);
    const featuredItems = storedItems.filter((it) => it.featured);

    const defaultCollections = [
      {
        id: 'anticeil_cyber_core',
        name: 'Anticeil Cyber Core',
        tagline: 'Koleksi Resmi Anticeil',
        subtitle: 'Tingkatkan tampilan profil Anda dengan nuansa masa depan, dekorasi hologram neon, dan pelat nama berpresisi tinggi.',
        bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        actionLabel: 'Lihat Koleksi Cyber',
        items: storedItems.filter((i) => i.collection === 'Anticeil Cyber Core'),
      },
      {
        id: 'starlight_cosmic',
        name: 'Starlight Cosmic',
        tagline: 'Galactic Wonder',
        subtitle: 'Pancarkan aura kosmik tak terbatas dengan cincin nebula dan efek aurora konstelasi bintang.',
        bannerUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
        actionLabel: 'Jelajahi Kosmik',
        items: storedItems.filter((i) => i.collection === 'Starlight Cosmic'),
      },
      {
        id: 'obsidian_minimalist',
        name: 'Obsidian Minimalist',
        tagline: 'Sleek & Clean',
        subtitle: 'Desain monokrom premium bagi pengguna yang menyukai estetika rapi, bersih, dan berwibawa.',
        bannerUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
        actionLabel: 'Buka Minimalist',
        items: storedItems.filter((i) => i.collection === 'Obsidian Minimalist'),
      },
    ];

    const rawCollections = await communityService.get<any[]>('community_shop_collections', defaultCollections);
    const sanitizeCollections = (cols: any[]) => {
      if (!Array.isArray(cols)) return defaultCollections;
      const valid = cols.filter((c) =>
        c &&
        c.id !== 'zenless_zone_zero' &&
        c.id !== 'deadpool_wolverine' &&
        c.id !== 'dead_by_daylight' &&
        !String(c.name || '').includes('Zenless') &&
        !String(c.name || '').includes('Marvel') &&
        !String(c.name || '').includes('Deadpool') &&
        !String(c.name || '').includes('Daylight')
      );
      return valid.length > 0 ? valid : defaultCollections;
    };

    const collections = sanitizeCollections(rawCollections);
    if (collections.length !== rawCollections?.length) {
      await communityService.set('community_shop_collections', collections);
    }

    return {
      heroCollection: collections[0] || defaultCollections[0],
      collections,
      featuredItems,
    };
  });

  app.post('/community/shop/featured', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { collections } = (req.body as any) || {};
    if (Array.isArray(collections)) {
      await communityService.set('community_shop_collections', collections);
    }
    return { success: true, message: 'Featured collections berhasil diperbarui!' };
  });

  app.get('/community/shop/balance', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const rawBal = await communityService.get<any>(`community_shop_balance_${userId}`, {
      dew: 1500,
      currencyCode: 'IDR',
    });
    const currentDew = typeof rawBal.dew === 'number' ? rawBal.dew : (typeof rawBal.orbs === 'number' ? rawBal.orbs : 1500);
    return {
      dew: currentDew,
      orbs: currentDew,
      currencyCode: rawBal.currencyCode || 'IDR',
    };
  });

  app.post('/community/shop/purchase', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { itemId, currency = 'dew' } = (req.body as any) || {};

    const storedItems = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
    const targetItem = storedItems.find((i) => i.id === itemId);
    if (!targetItem) {
      return { success: false, message: 'Item tidak ditemukan di Shop.' };
    }

    const inventory = await communityService.get<any[]>(`community_shop_inventory_${userId}`, []);
    if (inventory.some((i) => i.id === itemId)) {
      return { success: true, message: 'Item sudah dimiliki di inventaris Anda.', item: targetItem, alreadyOwned: true };
    }

    // Check if item allows Dew currency
    if ((currency === 'dew' || currency === 'orbs') && (targetItem.allowDew === false || (targetItem.priceDew || targetItem.priceOrbs || 0) <= 0)) {
      return { success: false, message: 'Item ini eksklusif dan hanya dapat dibeli menggunakan Uang Asli (IDR).' };
    }

    // Check balance
    const balanceKey = `community_shop_balance_${userId}`;
    const rawBal = await communityService.get<any>(balanceKey, { dew: 1500, currencyCode: 'IDR' });
    const currentDew = typeof rawBal.dew === 'number' ? rawBal.dew : (typeof rawBal.orbs === 'number' ? rawBal.orbs : 1500);
    const cost = targetItem.priceDew || targetItem.priceOrbs || 600;

    if ((currency === 'dew' || currency === 'orbs') && currentDew < cost) {
      return { success: false, message: 'Saldo Dew Anda tidak mencukupi untuk item ini.' };
    }

    const updatedDew = (currency === 'dew' || currency === 'orbs') ? currentDew - cost : currentDew;
    const newBalance = {
      dew: updatedDew,
      orbs: updatedDew,
      currencyCode: rawBal.currencyCode || 'IDR',
    };

    if (currency === 'dew' || currency === 'orbs') {
      await communityService.set(balanceKey, newBalance);
    }

    const purchasedRecord = {
      ...targetItem,
      purchasedAt: new Date().toISOString(),
      transactionId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    const updatedInventory = [...inventory, purchasedRecord];
    await communityService.set(`community_shop_inventory_${userId}`, updatedInventory);

    return {
      success: true,
      message: `Berhasil membeli ${targetItem.name}! 🎉`,
      item: purchasedRecord,
      newBalance,
    };
  });

  app.post('/community/shop/topup', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { amount = 500 } = (req.body as any) || {};

    const balanceKey = `community_shop_balance_${userId}`;
    const rawBal = await communityService.get<any>(balanceKey, { dew: 1500, currencyCode: 'IDR' });
    const currentDew = (typeof rawBal.dew === 'number' ? rawBal.dew : (typeof rawBal.orbs === 'number' ? rawBal.orbs : 1500)) + Number(amount);
    const newBalance = {
      dew: currentDew,
      orbs: currentDew,
      currencyCode: rawBal.currencyCode || 'IDR',
    };
    await communityService.set(balanceKey, newBalance);

    return {
      success: true,
      message: `Berhasil menambahkan +${amount} Dew ke saldo Anda! 💧`,
      balance: newBalance,
    };
  });

  app.get('/community/shop/inventory', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    return await communityService.get<any[]>(`community_shop_inventory_${userId}`, []);
  });

  app.get('/community/shop/wishlist', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    return await communityService.get<any[]>(`community_shop_wishlist_${userId}`, []);
  });

  app.post('/community/shop/wishlist/:itemId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { itemId } = req.params as { itemId: string };

    const wishlistKey = `community_shop_wishlist_${userId}`;
    const currentWishlist = await communityService.get<any[]>(wishlistKey, []);

    let updatedWishlist: any[];
    let isWishlisted: boolean;

    if (currentWishlist.some((i) => i.id === itemId)) {
      updatedWishlist = currentWishlist.filter((i) => i.id !== itemId);
      isWishlisted = false;
    } else {
      const storedItems = await communityService.get<any[]>('community_shop_items', INITIAL_SHOP_ITEMS);
      const target = storedItems.find((i) => i.id === itemId);
      if (target) {
        updatedWishlist = [...currentWishlist, target];
        isWishlisted = true;
      } else {
        updatedWishlist = currentWishlist;
        isWishlisted = false;
      }
    }

    await communityService.set(wishlistKey, updatedWishlist);
    return { success: true, isWishlisted, wishlist: updatedWishlist };
  });

  app.post('/community/shop/equip', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { itemId, slot } = (req.body as any) || {};

    const profileKey = `community_user_profile_${userId}`;
    const currentProfile = await communityService.get<any>(profileKey, {});
    const updatedProfile = {
      ...currentProfile,
      [slot]: itemId,
      updatedAt: new Date().toISOString(),
    };
    await communityService.set(profileKey, updatedProfile);
    return { success: true, slot, itemId, profile: updatedProfile };
  });

  // ── 7. Gamification Quests System (F2P Dew Economy) ──
  const INITIAL_QUESTS = [
    {
      id: 'quest_watch_together',
      title: 'YouTube Watch Party Explorer',
      subtitle: 'Tonton video YouTube bersama kawan di Voice Channel selama 10 menit.',
      category: 'activity',
      promoter: 'Anticeil Activities',
      coverUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
      badge: 'Unggulan',
      rewardDew: 300,
      rewardIcon: '💧',
      target: 10,
      unit: 'menit',
      actionLabel: 'Mulai Menonton',
      appId: 'youtube-watch',
      endsAt: '2026-12-31T23:59:59Z',
    },
    {
      id: 'quest_chess_master',
      title: 'Anticeil Chess PvP / AI Challenge',
      subtitle: 'Mainkan minimal 1 pertandingan catur multiplayer atau tantang Bot AI.',
      category: 'game',
      promoter: 'Anticeil Games',
      coverUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&auto=format&fit=crop&q=80',
      badge: 'Game Baru',
      rewardDew: 250,
      rewardIcon: '💧',
      target: 1,
      unit: 'ronde',
      actionLabel: 'Main Catur',
      appId: 'chess',
      endsAt: '2026-12-31T23:59:59Z',
    },
    {
      id: 'quest_active_chat',
      title: 'Active Community Messenger',
      subtitle: 'Kirimkan minimal 5 pesan di saluran teks Colony atau pesan langsung.',
      category: 'social',
      promoter: 'Anticeil Community',
      coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      badge: 'Harian',
      rewardDew: 200,
      rewardIcon: '💧',
      target: 5,
      unit: 'pesan',
      actionLabel: 'Mulai Chat',
      appId: 'chat',
      endsAt: '2026-12-31T23:59:59Z',
    },
    {
      id: 'quest_jamspace_board',
      title: 'Jamspace Whiteboard Collab',
      subtitle: 'Buka kanvas Jamspace Whiteboard dan buat sketsa ide bersama teman saluran.',
      category: 'activity',
      promoter: 'Anticeil Studio',
      coverUrl: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80',
      badge: 'Kreatif',
      rewardDew: 200,
      rewardIcon: '💧',
      target: 1,
      unit: 'sesi',
      actionLabel: 'Buka Kanvas',
      appId: 'whiteboard',
      endsAt: '2026-12-31T23:59:59Z',
    },
    {
      id: 'quest_profile_styler',
      title: 'Profil Estetik Eksklusif',
      subtitle: 'Pasang bingkai avatar animasi atau efek profil di pengaturan akun Anda.',
      category: 'profile',
      promoter: 'Anticeil Studio',
      coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      badge: 'Estetik',
      rewardDew: 100,
      rewardIcon: '💧',
      target: 1,
      unit: 'profil',
      actionLabel: 'Buka Profil',
      appId: 'profile',
      endsAt: '2026-12-31T23:59:59Z',
    },
  ];

  app.get('/community/quests', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const questList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const userQuestsState = await communityService.get<Record<string, any>>(`community_quests_user_${userId}`, {});

    const quests = questList.map((q) => {
      const state = userQuestsState[q.id] || {};
      const status = state.status || 'available';
      const progress = state.progress || 0;
      return {
        ...q,
        status, // 'available' | 'in_progress' | 'completed' | 'claimed'
        progress,
        acceptedAt: state.acceptedAt || null,
        claimedAt: state.claimedAt || null,
      };
    });

    return quests;
  });

  app.post('/community/quests', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const newQuest = {
      id: body.id || `quest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: body.title || 'Misi Komunitas Baru',
      subtitle: body.subtitle || 'Selesaikan misi untuk mendapatkan Dew gratis.',
      category: body.category || 'activity',
      promoter: body.promoter || 'Anticeil Community',
      coverUrl: body.coverUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80',
      badge: body.badge || 'Misi Baru',
      rewardDew: Number(body.rewardDew) || 200,
      rewardIcon: '💧',
      target: Number(body.target) || 1,
      unit: body.unit || 'kali',
      actionLabel: body.actionLabel || 'Luncurkan',
      appId: body.appId || 'chat',
      endsAt: body.endsAt || '2026-12-31T23:59:59Z',
      status: 'available',
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    const currentList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const updated = [newQuest, ...currentList.filter((q) => q.id !== newQuest.id)];
    await communityService.set('community_quests_list', updated);

    return {
      success: true,
      message: `Quest "${newQuest.title}" berhasil ditambahkan! 🎯`,
      quest: newQuest,
      quests: updated,
    };
  });

  app.put('/community/quests/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const currentList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const index = currentList.findIndex((q) => q.id === id);

    if (index === -1) {
      return { success: false, message: 'Quest tidak ditemukan.' };
    }

    const updatedQuest = {
      ...currentList[index],
      ...body,
      id,
      rewardDew: body.rewardDew !== undefined ? Number(body.rewardDew) : currentList[index].rewardDew,
      target: body.target !== undefined ? Number(body.target) : currentList[index].target,
    };
    currentList[index] = updatedQuest;
    await communityService.set('community_quests_list', currentList);

    return {
      success: true,
      message: `Quest "${updatedQuest.title}" berhasil diperbarui! ✨`,
      quest: updatedQuest,
    };
  });

  app.delete('/community/quests/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const currentList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const updated = currentList.filter((q) => q.id !== id);
    await communityService.set('community_quests_list', updated);

    return {
      success: true,
      message: 'Quest berhasil dihapus dari daftar!',
      deletedId: id,
    };
  });

  app.post('/community/quests/accept', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { questId } = (req.body as any) || {};

    const questList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const target = questList.find((q) => q.id === questId);
    if (!target) {
      return { success: false, message: 'Quest tidak ditemukan.' };
    }

    const stateKey = `community_quests_user_${userId}`;
    const userQuestsState = await communityService.get<Record<string, any>>(stateKey, {});
    const existing = userQuestsState[questId] || {};

    if (existing.status === 'claimed') {
      return { success: false, message: 'Quest ini sudah Anda klaim sebelumnya.' };
    }

    userQuestsState[questId] = {
      ...existing,
      status: existing.status === 'completed' ? 'completed' : 'in_progress',
      progress: existing.progress || 0,
      acceptedAt: existing.acceptedAt || new Date().toISOString(),
    };

    await communityService.set(stateKey, userQuestsState);
    return {
      success: true,
      message: `Quest "${target.title}" berhasil diterima! Selesaikan untuk mendapatkan ${target.rewardDew} Dew. 🎯`,
      quest: { ...target, ...userQuestsState[questId] },
    };
  });

  app.post('/community/quests/progress', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { questId, amount = 1 } = (req.body as any) || {};

    const questList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const target = questList.find((q) => q.id === questId);
    if (!target) {
      return { success: false, message: 'Quest tidak ditemukan.' };
    }

    const stateKey = `community_quests_user_${userId}`;
    const userQuestsState = await communityService.get<Record<string, any>>(stateKey, {});
    const existing = userQuestsState[questId] || { status: 'in_progress', progress: 0 };

    if (existing.status === 'claimed') {
      return { success: false, message: 'Quest ini sudah diklaim.' };
    }

    const newProgress = Math.min(target.target, (existing.progress || 0) + Number(amount));
    const newStatus = newProgress >= target.target ? 'completed' : 'in_progress';

    userQuestsState[questId] = {
      ...existing,
      status: newStatus,
      progress: newProgress,
      completedAt: newStatus === 'completed' ? (existing.completedAt || new Date().toISOString()) : null,
    };

    await communityService.set(stateKey, userQuestsState);
    return {
      success: true,
      message: newStatus === 'completed' ? `Selamat! Quest "${target.title}" telah selesai! Klaim Dew sekarang. 🎉` : `Progress quest "${target.title}" diperbarui.`,
      quest: { ...target, ...userQuestsState[questId] },
    };
  });

  app.post('/community/quests/claim', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    const { questId } = (req.body as any) || {};

    const questList = await communityService.get<any[]>('community_quests_list', INITIAL_QUESTS);
    const target = questList.find((q) => q.id === questId);
    if (!target) {
      return { success: false, message: 'Quest tidak ditemukan.' };
    }

    const stateKey = `community_quests_user_${userId}`;
    const userQuestsState = await communityService.get<Record<string, any>>(stateKey, {});
    const existing = userQuestsState[questId] || {};

    if (existing.status === 'claimed') {
      return { success: false, message: 'Hadiah quest ini sudah pernah diklaim.' };
    }

    // Set claimed
    userQuestsState[questId] = {
      ...existing,
      status: 'claimed',
      progress: target.target,
      claimedAt: new Date().toISOString(),
    };
    await communityService.set(stateKey, userQuestsState);

    // Increase User Dew Balance
    const balanceKey = `community_shop_balance_${userId}`;
    const rawBal = await communityService.get<any>(balanceKey, { dew: 1500, currencyCode: 'IDR' });
    const currentDew = typeof rawBal.dew === 'number' ? rawBal.dew : (typeof rawBal.orbs === 'number' ? rawBal.orbs : 1500);
    const newDew = currentDew + target.rewardDew;
    const newBalance = {
      dew: newDew,
      orbs: newDew,
      currencyCode: rawBal.currencyCode || 'IDR',
    };
    await communityService.set(balanceKey, newBalance);

    // Save into claimed history
    const claimedKey = `community_quests_claimed_${userId}`;
    const claimedHistory = await communityService.get<any[]>(claimedKey, []);
    const claimedRecord = {
      ...target,
      claimedAt: new Date().toISOString(),
    };
    await communityService.set(claimedKey, [claimedRecord, ...claimedHistory.filter((c) => c.id !== questId)]);

    return {
      success: true,
      message: `Selamat! Anda berhasil mengklaim +${target.rewardDew} Dew dari quest "${target.title}"! 💧🎉`,
      rewardDew: target.rewardDew,
      newBalance,
      quest: { ...target, ...userQuestsState[questId] },
    };
  });

  app.get('/community/quests/claimed', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const user = (req as any).user || {};
    const userId = user.id || 'me';
    return await communityService.get<any[]>(`community_quests_claimed_${userId}`, []);
  });
};
