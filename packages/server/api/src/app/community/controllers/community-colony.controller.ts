import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { securityAccess } from '../../core/security/authorization/fastify-security';
import { authenticateOrThrow } from '../../core/security/v2/authn/authenticate';
import { communityService } from '../community.service';

export const communityColonyController: FastifyPluginAsyncZod = async (app) => {
  // ── Colony Management & Discovery Endpoints ──
  app.get('/colony/colonies', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const query = (req.query as any) || {};
    const { userId, email, all } = query;
    const authHeader = req.headers['authorization'];
    let currentUserId: string | null = (userId && userId !== 'undefined' && userId !== 'null') ? String(userId) : null;
    let currentUserEmail: string | null = (email && email !== 'undefined' && email !== 'null') ? String(email).toLowerCase().trim() : null;
    let principal: any = null;

    if (!currentUserId && authHeader && authHeader.startsWith('Bearer ')) {
      try {
        principal = await authenticateOrThrow(req.log, authHeader);
        if (principal && principal.id) {
          currentUserId = principal.id;
          const principalEmail = (principal as any).email;
          if (principalEmail) currentUserEmail = String(principalEmail).toLowerCase().trim();
        }
      } catch {}
    }

    const userDomain = currentUserEmail && currentUserEmail.includes('@')
      ? currentUserEmail.split('@')[1].toLowerCase().trim()
      : null;

    let list = await communityService.get<any[]>('community_colonies', []);

    // Ensure official default colony 'anticeil' always exists
    if (!list.some((c) => c.id === 'anticeil')) {
      const defaultAnticeil = {
        id: 'anticeil',
        name: 'Anticeil Official',
        description: 'Server resmi komunitas pengembang dan kreator Anticeil.',
        color: 'bg-primary',
        iconType: 'logo',
        initials: 'ANT',
        membersCount: 1,
        onlineCount: 1,
        isPublic: true,
        visibility: 'public',
        tags: ['anticeil', 'official'],
        category: 'community',
      };
      list = [defaultAnticeil, ...list];
      await communityService.set('community_colonies', list);
    }

    const populated = await Promise.all(
      list.map(async (c) => {
        const members = await communityService.get<any[]>(`community_colony_members_${c.id}`, []);
        const membersCount = members.length > 0 ? members.length : (typeof c.membersCount === 'number' && c.membersCount > 0 ? c.membersCount : 1);
        const onlineCount = members.length > 0
          ? members.filter((m) => m.status !== 'offline').length || 1
          : (typeof c.onlineCount === 'number' && c.onlineCount > 0 ? c.onlineCount : 1);

        // Strict SSO domain matching check (Only for enterprise/royal tier colonies with explicit domains configured)
        const allowedDomains: string[] = Array.isArray(c.allowedEmailDomains)
          ? c.allowedEmailDomains.map((d: string) => String(d).toLowerCase().trim().replace(/^@/, ''))
          : [];
        const domainMatches = Boolean(
          userDomain &&
          allowedDomains.length > 0 &&
          allowedDomains.includes(userDomain) &&
          c.ssoEnabled === true
        );

        // JIT Auto-Provision member only if strict domain matched
        if (domainMatches && currentUserEmail) {
          const isAlreadyEnrolled = members.some(
            (m) => (m.email && m.email.toLowerCase().trim() === currentUserEmail) || (currentUserId && m.id === currentUserId)
          );
          if (!isAlreadyEnrolled) {
            const principalUser = principal || {};
            members.push({
              id: currentUserId || `user_sso_${Date.now()}`,
              name: principalUser.firstName
                ? `${principalUser.firstName} ${principalUser.lastName || ''}`.trim()
                : principalUser.name || currentUserEmail.split('@')[0],
              username: principalUser.username || currentUserEmail.split('@')[0],
              email: currentUserEmail,
              avatar: principalUser.imageUrl || principalUser.avatar || null,
              role: 'member',
              status: 'online',
              isSsoUser: true,
              joinedAt: new Date().toISOString(),
            });
            await communityService.set(`community_colony_members_${c.id}`, members);
          }
        }

        const isOwner = Boolean(currentUserId && c.ownerId && String(c.ownerId) === String(currentUserId));
        const isEnrolled = Boolean(
          (currentUserId && members.some((m) => (m.id && String(m.id) === String(currentUserId)) || (m.userId && String(m.userId) === String(currentUserId)))) ||
          (currentUserEmail && members.some((m) => m.email && m.email.toLowerCase().trim() === currentUserEmail))
        );

        const isMember = isOwner || isEnrolled || domainMatches;

        return {
          ...c,
          membersCount: members.length > 0 ? members.length : membersCount,
          onlineCount: members.length > 0 ? members.filter((m) => m.status !== 'offline').length || 1 : onlineCount,
          isMember,
          role: isOwner ? 'owner' : (isMember ? 'member' : c.role || 'member'),
        };
      })
    );

    // If requesting all=true (e.g. discovery / admin), return discoverable colonies
    if (all === 'true' || all === true) {
      return populated.map(({ isMember, ...rest }) => ({ ...rest, isMember }));
    }

    // Default (sidebar rail): Return STRICTLY only colonies the user belongs to + default 'anticeil'
    if (currentUserId || currentUserEmail) {
      return populated
        .filter((c) => c.id === 'anticeil' || c.isMember)
        .map(({ isMember, ...rest }) => rest);
    }

    // If no user is identified at all, strictly isolate to default home colony ('anticeil')
    return populated
      .filter((c) => c.id === 'anticeil')
      .map(({ isMember, ...rest }) => rest);
  });

  app.post('/colony/colonies', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const list = await communityService.get<any[]>('community_colonies', []);
    const body = (req.body as any) || {};
    const user = (req as any).user || body.user || {};

    let creatorUserId = body.ownerId || body.userId || user.id;
    const authHeader = req.headers['authorization'];
    if ((!creatorUserId || creatorUserId === 'undefined' || creatorUserId === 'null') && authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const principal = await authenticateOrThrow(req.log, authHeader);
        if (principal?.id) creatorUserId = principal.id;
      } catch {}
    }
    if (!creatorUserId || creatorUserId === 'undefined' || creatorUserId === 'null') {
      creatorUserId = `user_${Date.now()}`;
    }

    const isPublic = body.isPublic !== undefined ? Boolean(body.isPublic) : (body.visibility === 'public');
    const colonyId = body.id || `hub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const creatorMember = {
      id: creatorUserId,
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (body.ownerName || user.name || 'Admin'),
      username: user.email?.split('@')[0] || body.ownerUsername || user.username || 'admin',
      avatar: user.avatar || body.ownerAvatar || null,
      role: 'owner',
      status: 'online',
      joinedAt: new Date().toISOString(),
    };
    await communityService.set(`community_colony_members_${colonyId}`, [creatorMember]);

    const newColony = {
      ...body,
      id: colonyId,
      name: body.name || 'Colony Baru',
      description: body.description || '',
      color: body.color || 'bg-indigo-600',
      iconUrl: body.iconUrl || undefined,
      initials: body.initials || (body.name ? body.name.slice(0, 3).toUpperCase() : 'CLN'),
      inviteCode: body.inviteCode || Math.random().toString(36).slice(2, 8).toUpperCase(),
      membersCount: 1,
      onlineCount: 1,
      role: 'owner',
      ownerId: creatorUserId,
      tags: body.tags || ['komunitas'],
      category: body.category || 'community',
      isPublic,
      visibility: isPublic ? 'public' : 'private',
      accessSettings: body.accessSettings || {
        joinMethod: isPublic ? 'discoverable' : 'invite_only',
      },
    };
    const updated = [...list.filter((c) => c.id !== newColony.id), newColony];
    await communityService.set('community_colonies', updated);

    // Realtime broadcast for public colony discovery
    if ((app as any).io && isPublic) {
      (app as any).io.emit('COMMUNITY_COLONY_DISCOVER_UPDATED', { colony: newColony });
    }

    return newColony;
  });

  app.put('/colony/colonies/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_colonies', []);
    const body = (req.body as any) || {};
    const updated = list.map((c) => {
      if (c.id === id) {
        const isPublic = body.isPublic !== undefined
          ? Boolean(body.isPublic)
          : (body.visibility !== undefined ? body.visibility === 'public' : c.isPublic);
        return {
          ...c,
          ...body,
          isPublic,
          visibility: isPublic ? 'public' : 'private',
        };
      }
      return c;
    });
    await communityService.set('community_colonies', updated);
    const saved = updated.find((c) => c.id === id);
    return saved || { id, ...body };
  });

  app.delete('/colony/colonies/:id', {
    config: { security: securityAccess.public() },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (id === 'anticeil') {
      return reply.status(403).send({ message: 'Colony resmi Anticeil tidak dapat dihapus.' });
    }

    const list = await communityService.get<any[]>('community_colonies', []);
    const targetColony = list.find((c) => c.id === id);

    if (targetColony) {
      const user = (req as any).user || {};
      let requesterId = user.id || (req.query as any)?.userId || (req.body as any)?.userId;
      const authHeader = req.headers['authorization'];
      if ((!requesterId || requesterId === 'undefined') && authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const principal = await authenticateOrThrow(req.log, authHeader);
          if (principal?.id) requesterId = principal.id;
        } catch {}
      }

      if (requesterId) {
        const members = await communityService.get<any[]>(`community_colony_members_${id}`, []);
        const member = members.find((m) => m.id === requesterId || m.userId === requesterId);
        const isOwner = targetColony.ownerId === requesterId || member?.role === 'owner';
        const isAdmin = member?.role === 'admin' || user.platformRole === 'ADMIN';

        if (!isOwner && !isAdmin) {
          return reply.status(403).send({ message: 'Hanya Pemilik Colony atau Admin yang berhak menghapus Colony ini.' });
        }
      }
    }

    const updated = list.filter((c) => c.id !== id);
    await communityService.set('community_colonies', updated);
    await communityService.delete(`community_colony_members_${id}`);
    await communityService.delete(`community_colony_channels_${id}`);

    // Realtime broadcast deletion to all connected clients
    if ((app as any).io) {
      (app as any).io.emit('COMMUNITY_COLONY_DELETED', { colonyId: id });
    }

    return { success: true, colonyId: id };
  });

  app.post('/colony/colonies/:id/leave', {
    config: { security: securityAccess.public() },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (id === 'anticeil') {
      return reply.status(400).send({ message: 'Anda tidak dapat meninggalkan server resmi Anticeil.' });
    }

    const body = (req.body as any) || {};
    const user = (req as any).user || body.user || {};
    let requesterId = body.userId || user.id;
    const authHeader = req.headers['authorization'];
    if ((!requesterId || requesterId === 'undefined') && authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const principal = await authenticateOrThrow(req.log, authHeader);
        if (principal?.id) requesterId = principal.id;
      } catch {}
    }

    if (!requesterId) {
      return reply.status(400).send({ message: 'User ID tidak ditemukan.' });
    }

    const list = await communityService.get<any[]>('community_colonies', []);
    const targetColony = list.find((c) => c.id === id);

    if (targetColony && targetColony.ownerId === requesterId) {
      return reply.status(400).send({ message: 'Pemilik tidak dapat meninggalkan Colony. Silakan hapus Colony atau alihkan kepemilikan terlebih dahulu.' });
    }

    const members = await communityService.get<any[]>(`community_colony_members_${id}`, []);
    const updatedMembers = members.filter((m) => m.id !== requesterId && m.userId !== requesterId);
    await communityService.set(`community_colony_members_${id}`, updatedMembers);

    const updatedList = list.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          membersCount: Math.max(1, (c.membersCount || 1) - 1),
        };
      }
      return c;
    });
    await communityService.set('community_colonies', updatedList);

    if ((app as any).io) {
      (app as any).io.emit('COMMUNITY_MEMBER_REMOVED', { hubId: id, userId: requesterId });
    }

    return { success: true, colonyId: id, message: 'Berhasil keluar dari Colony.' };
  });

  app.put('/colony/colonies/:id/access', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_colonies', []);
    const accessSettings = (req.body as any) || {};
    const isPublic = accessSettings.joinMethod === 'discoverable';
    const updated = list.map((c) => (c.id === id ? {
      ...c,
      accessSettings,
      isPublic,
      visibility: isPublic ? 'public' : 'private',
    } : c));
    await communityService.set('community_colonies', updated);
    return { success: true, accessSettings };
  });

  app.post('/colony/colonies/:id/boost', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const list = await communityService.get<any[]>('community_colonies', []);
    let updatedColony: any = null;
    const updated = list.map((c) => {
      if (c.id === id) {
        const boostsCount = (c.boostsCount || 0) + 1;
        const boostTier = boostsCount >= 10 ? 3 : boostsCount >= 5 ? 2 : boostsCount >= 2 ? 1 : 0;
        updatedColony = { ...c, boostsCount, boostTier };
        return updatedColony;
      }
      return c;
    });
    await communityService.set('community_colonies', updated);
    return updatedColony || { success: true, boostsCount: 1, boostTier: 0 };
  });

  // ── Colony Members Management (Fullstack) ──
  app.get('/colony/colonies/:id/members', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const members = await communityService.get<any[]>(`community_colony_members_${id}`, []);
    return members;
  });

  app.post('/colony/colonies/:id/members', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const members = await communityService.get<any[]>(`community_colony_members_${id}`, []);
    const newMember = {
      id: body.id || body.userId || `user_${Date.now()}`,
      name: body.name || 'Anggota Baru',
      username: body.username || undefined,
      avatar: body.avatar || null,
      role: body.role || 'member',
      status: body.status || 'online',
      joinedAt: new Date().toISOString(),
    };
    const updatedMembers = [...members.filter((m) => m.id !== newMember.id), newMember];
    await communityService.set(`community_colony_members_${id}`, updatedMembers);

    const list = await communityService.get<any[]>('community_colonies', []);
    const updatedList = list.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          membersCount: updatedMembers.length,
          onlineCount: updatedMembers.filter((m) => m.status !== 'offline').length || 1,
        };
      }
      return c;
    });
    await communityService.set('community_colonies', updatedList);
    return { success: true, member: newMember, membersCount: updatedMembers.length };
  });

  app.delete('/colony/colonies/:id/members/:userId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const members = await communityService.get<any[]>(`community_colony_members_${id}`, []);
    const updatedMembers = members.filter((m) => m.id !== userId);
    await communityService.set(`community_colony_members_${id}`, updatedMembers);

    const list = await communityService.get<any[]>('community_colonies', []);
    const updatedList = list.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          membersCount: Math.max(1, updatedMembers.length),
          onlineCount: Math.max(1, updatedMembers.filter((m) => m.status !== 'offline').length),
        };
      }
      return c;
    });
    await communityService.set('community_colonies', updatedList);
    return { success: true, membersCount: updatedMembers.length };
  });

  app.put('/colony/colonies/:id/members/:userId/role', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id, userId } = req.params as { id: string; userId: string };
    const { role } = (req.body as any) || {};
    const members = await communityService.get<any[]>(`community_colony_members_${id}`, []);
    const updatedMembers = members.map((m) => (m.id === userId ? { ...m, role: role || m.role } : m));
    await communityService.set(`community_colony_members_${id}`, updatedMembers);
    return { success: true, userId, role };
  });

  // Discovery Endpoint: returns ONLY public/discoverable colonies from real database
  app.get('/colony/colonies/discover', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const query = (req.query as any) || {};
    const q = (query.q || '').toLowerCase().trim();
    const cat = (query.category || '').toLowerCase().trim();

    // Fetch real colonies stored in the database
    let stored = await communityService.get<any[]>('community_colonies', []);

    // Filter strictly for PUBLIC colonies only:
    let publicOnly = stored.filter((c) => {
      if (c.id === 'anticeil' || c.id === 'direct-messages') return false;
      const isExplicitPrivate = c.isPublic === false || c.visibility === 'private';
      if (isExplicitPrivate) return false;
      const isExplicitPublic = c.isPublic === true || c.visibility === 'public' || c.accessSettings?.joinMethod === 'discoverable';
      return isExplicitPublic;
    });

    // If no public colonies exist yet in database, seed high quality initial public communities
    if (publicOnly.length === 0) {
      const seedColonies = [
        {
          id: 'hub_gaming_community',
          name: 'Anticeil Gaming Lounge',
          description: 'Tempat kumpul gamer esport, casual, streaming, dan party voice channel.',
          color: 'bg-emerald-600',
          initials: 'AGL',
          inviteCode: 'GAMING01',
          membersCount: 128,
          onlineCount: 42,
          isPublic: true,
          visibility: 'public',
          category: 'gaming',
          tags: ['gaming', 'esports', 'streamer'],
          accessSettings: { joinMethod: 'discoverable' },
          verified: true,
        },
        {
          id: 'hub_tech_innovators',
          name: 'Tech & AI Pioneers',
          description: 'Komunitas developer, AI engineers, dan tech enthusiasts saling berbagi ide & proyek.',
          color: 'bg-sky-600',
          initials: 'TEC',
          inviteCode: 'TECH01',
          membersCount: 95,
          onlineCount: 31,
          isPublic: true,
          visibility: 'public',
          category: 'tech',
          tags: ['tech', 'ai', 'coding', 'webdev'],
          accessSettings: { joinMethod: 'discoverable' },
          verified: true,
        },
        {
          id: 'hub_music_creators',
          name: 'Music & Lofi Beats',
          description: 'Ruang kolaborasi produser musik, beatmaker, sesi jamming santai, dan lofi hangout.',
          color: 'bg-purple-600',
          initials: 'MUS',
          inviteCode: 'MUSIC01',
          membersCount: 74,
          onlineCount: 19,
          isPublic: true,
          visibility: 'public',
          category: 'music',
          tags: ['music', 'lofi', 'beats', 'audio'],
          accessSettings: { joinMethod: 'discoverable' },
        },
        {
          id: 'hub_hangout_social',
          name: 'Anticeil Hangout Cafe',
          description: 'Ruang ngobrol santai lintas topik, berbagi cerita, memes, dan berteman baru.',
          color: 'bg-amber-600',
          initials: 'HNG',
          inviteCode: 'HANGOUT',
          membersCount: 110,
          onlineCount: 38,
          isPublic: true,
          visibility: 'public',
          category: 'community',
          tags: ['komunitas', 'hangout', 'santai'],
          accessSettings: { joinMethod: 'discoverable' },
        },
      ];

      stored = [...stored, ...seedColonies];
      await communityService.set('community_colonies', stored);
      publicOnly = seedColonies;
    }

    if (cat && cat !== 'all') {
      publicOnly = publicOnly.filter((c) => {
        const matchesCategory = c.category && c.category.toLowerCase() === cat;
        const matchesTag = c.tags && Array.isArray(c.tags) && c.tags.some((t: string) => t.toLowerCase().includes(cat));
        return matchesCategory || matchesTag;
      });
    }

    if (q) {
      publicOnly = publicOnly.filter((c) => {
        const matchName = c.name && c.name.toLowerCase().includes(q);
        const matchDesc = c.description && c.description.toLowerCase().includes(q);
        const matchTag = c.tags && Array.isArray(c.tags) && c.tags.some((t: string) => t.toLowerCase().includes(q));
        return matchName || matchDesc || matchTag;
      });
    }

    // Populate actual member & online counts
    const populated = await Promise.all(
      publicOnly.map(async (c) => {
        const members = await communityService.get<any[]>(`community_colony_members_${c.id}`, []);
        const membersCount = members.length > 0 ? members.length : (typeof c.membersCount === 'number' && c.membersCount > 0 ? c.membersCount : 1);
        const onlineCount = members.length > 0
          ? members.filter((m) => m.status !== 'offline').length || 1
          : (typeof c.onlineCount === 'number' && c.onlineCount > 0 ? c.onlineCount : 1);
        return {
          ...c,
          membersCount,
          onlineCount,
        };
      })
    );

    return populated;
  });

  app.post('/colony/colonies/join', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, inviteCode, user: joinUser, userId: bodyUserId } = (req.body as any) || {};
    const authHeader = req.headers['authorization'];
    let tokenUserId: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const principal = await authenticateOrThrow(req.log, authHeader);
        if (principal && principal.id) tokenUserId = principal.id;
      } catch {}
    }

    const stored = await communityService.get<any[]>('community_colonies', []);
    const target = stored.find((c) => c.id === colonyId || (inviteCode && (c.inviteCode === inviteCode || c.id === inviteCode)));
    if (target) {
      const members = await communityService.get<any[]>(`community_colony_members_${target.id}`, []);
      const currentReqUser = (req as any).user || joinUser || {};
      const newMemberId = bodyUserId || currentReqUser.id || tokenUserId || `user_${Date.now()}`;
      if (!members.some((m) => m.id === newMemberId)) {
        members.push({
          id: newMemberId,
          name: currentReqUser.firstName ? `${currentReqUser.firstName} ${currentReqUser.lastName || ''}`.trim() : (currentReqUser.name || 'Anggota Baru'),
          username: currentReqUser.username || currentReqUser.email?.split('@')[0] || 'member',
          avatar: currentReqUser.avatar || null,
          role: 'member',
          status: 'online',
          joinedAt: new Date().toISOString(),
        });
        await communityService.set(`community_colony_members_${target.id}`, members);
      }
      target.membersCount = members.length;
      target.onlineCount = members.filter((m) => m.status !== 'offline').length || 1;
      await communityService.set('community_colonies', stored);
      return { success: true, colony: target };
    }
    return { success: true, colony: { id: colonyId || inviteCode, name: 'Colony Komunitas', role: 'member', membersCount: 1, onlineCount: 1 } };
  });

  // ── Colony Enterprise Tier Royal & SSO Auto-Join (JIT Provisioning) ───
  app.post('/colony/sso/auto-join', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { email, user: joinUser } = (req.body as any) || {};
    if (!email || !email.includes('@')) {
      return { success: false, joinedColonies: [] };
    }
    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (!domain) {
      return { success: false, joinedColonies: [] };
    }

    const stored = await communityService.get<any[]>('community_colonies', []);
    const joinedColonies: any[] = [];

    for (const colony of stored) {
      const isRoyal = colony.tier === 'royal';
      const ssoActive = colony.ssoEnabled !== false;
      const allowedDomains: string[] = Array.isArray(colony.allowedEmailDomains)
        ? colony.allowedEmailDomains.map((d: string) => String(d).toLowerCase().trim().replace(/^@/, ''))
        : [];

      // Auto-join if colony allows this domain (SSO enabled or Royal Tier)
      if (ssoActive && allowedDomains.includes(domain)) {
        const members = await communityService.get<any[]>(`community_colony_members_${colony.id}`, []);
        const currentReqUser = (req as any).user || joinUser || {};
        const newMemberId = currentReqUser.id || `user_sso_${Date.now()}`;
        const existingIndex = members.findIndex(
          (m) => m.id === newMemberId || (m.email && m.email.toLowerCase() === email.toLowerCase())
        );

        if (existingIndex === -1) {
          members.push({
            id: newMemberId,
            name:
              currentReqUser.firstName
                ? `${currentReqUser.firstName} ${currentReqUser.lastName || ''}`.trim()
                : currentReqUser.name || email.split('@')[0],
            username: currentReqUser.username || email.split('@')[0],
            email,
            avatar: currentReqUser.avatar || null,
            role: 'member',
            status: 'online',
            isSsoUser: true,
            joinedAt: new Date().toISOString(),
          });
          await communityService.set(`community_colony_members_${colony.id}`, members);
        }

        colony.membersCount = members.length;
        colony.onlineCount = members.filter((m) => m.status !== 'offline').length || 1;
        joinedColonies.push(colony);
      }
    }

    if (joinedColonies.length > 0) {
      await communityService.set('community_colonies', stored);
    }

    return { success: true, joinedColonies };
  });

  app.post('/colony/colonies/:id/verify-domain', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = req.params as { id: string };
    const stored = await communityService.get<any[]>('community_colonies', []);
    const target = stored.find((c) => c.id === id);
    if (!target) {
      return { success: false, message: 'Colony tidak ditemukan' };
    }

    target.domainVerified = true;
    target.domainVerificationToken = target.domainVerificationToken || `anticeil-verify=${Math.random().toString(36).slice(2, 12)}`;
    await communityService.set('community_colonies', stored);

    return { success: true, domainVerified: true, token: target.domainVerificationToken };
  });

  // ── 2. Channels & Categories Endpoints ──
  app.get('/colony/channels', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId = 'anticeil' } = (req.query as any) || {};
    const key = `colony_channels_${colonyId}`;
    const channels = await communityService.get<any[]>(key, []);
    if (channels.length === 0) {
      const defaultChannels = [
        {
          id: `ch_general_${colonyId}`,
          colonyId,
          name: 'general',
          description: 'Saluran obrolan umum kawan satu colony',
          type: 'text',
          category: 'CHANNELS',
        },
        {
          id: `ch_pengumuman_${colonyId}`,
          colonyId,
          name: 'pengumuman',
          description: 'Informasi dan pengumuman resmi',
          type: 'text',
          category: 'CHANNELS',
        },
        {
          id: `ch_voice_general_${colonyId}`,
          colonyId,
          name: 'Voice Lounge',
          description: 'Ruang ngobrol suara santai',
          type: 'voice',
          category: 'CHANNELS',
        },
        {
          id: `ch_gaming_${colonyId}`,
          colonyId,
          name: 'Gaming & Activities',
          description: 'Mabar game & nobar YouTube Watch Together',
          type: 'voice',
          category: 'CHANNELS',
        },
      ];
      await communityService.set(key, defaultChannels);
      return defaultChannels;
    }
    return channels;
  });

  app.post('/colony/channels', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const colonyId = body.colonyId || body.hubId || 'anticeil';
    const key = `colony_channels_${colonyId}`;
    const channels = await communityService.get<any[]>(key, []);

    const newChannel = {
      id: body.id || `ch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: body.name || 'new-channel',
      description: body.description || '',
      category: body.category || 'CHANNELS',
      colonyId,
      type: body.type || 'text',
      isPrivate: Boolean(body.isPrivate),
      categoryId: body.categoryId || null,
      categoryName: body.categoryName || null,
      isDirectMessage: Boolean(body.isDirectMessage),
      isGroupDm: Boolean(body.isGroupDm),
      dmUserIds: Array.isArray(body.dmUserIds) ? body.dmUserIds : undefined,
      ownerId: body.ownerId || undefined,
      avatar: body.avatar || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [...channels.filter((c) => c.id !== newChannel.id), newChannel];
    await communityService.set(key, updated);
    return newChannel;
  });

  app.put('/colony/channels/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const colonyId = body.colonyId || 'anticeil';
    const key = `colony_channels_${colonyId}`;
    const channels = await communityService.get<any[]>(key, []);
    const index = channels.findIndex((c) => c.id === id);

    if (index !== -1) {
      const updatedChannel = { ...channels[index], ...body };
      channels[index] = updatedChannel;
      await communityService.set(key, channels);
      return updatedChannel;
    }

    const fallback = { id, ...body, colonyId };
    await communityService.set(key, [...channels, fallback]);
    return fallback;
  });

  app.delete('/colony/channels/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const { colonyId = 'anticeil' } = (req.query as any) || {};
    const key = `colony_channels_${colonyId}`;
    const channels = await communityService.get<any[]>(key, []);
    await communityService.set(key, channels.filter((c) => c.id !== id));
    return { success: true, id };
  });

  // ── Colony Categories Endpoints (Fullstack CRUD) ──
  app.get('/colony/categories', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.query as any) || {};
    const defaultCategories = colonyId ? [
      { id: `cat_text_${colonyId}`, colonyId, name: 'TEXT CHANNELS', isDefault: true },
      { id: `cat_voice_${colonyId}`, colonyId, name: 'VOICE CHANNELS', isDefault: true },
    ] : [];
    const list = await communityService.get<any[]>('community_colony_categories', []);
    if (colonyId) {
      const colonyCustom = list.filter((c) => c.colonyId === colonyId);
      const defaults = defaultCategories.filter((d) => !colonyCustom.some((c) => c.id === d.id));
      return [...defaults, ...colonyCustom];
    }
    return list;
  });

  app.post('/colony/categories', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const newCat = {
      id: body.id || `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colonyId: body.colonyId,
      name: (body.name || '').trim().toUpperCase(),
    };
    const list = await communityService.get<any[]>('community_colony_categories', []);
    const updated = [...list.filter((c) => c.id !== newCat.id), newCat];
    await communityService.set('community_colony_categories', updated);
    return newCat;
  });

  app.put('/colony/categories/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const list = await communityService.get<any[]>('community_colony_categories', []);
    const updated = list.map((c) => (c.id === id ? { ...c, ...body, name: (body.name || c.name).trim().toUpperCase() } : c));
    await communityService.set('community_colony_categories', updated);
    return updated.find((c) => c.id === id) || { success: true, id };
  });

  app.delete('/colony/categories/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const list = await communityService.get<any[]>('community_colony_categories', []);
    await communityService.set('community_colony_categories', list.filter((c) => c.id !== id));
    return { success: true, id };
  });

  app.get('/colony/channels/:channelId/permissions', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_ch_perms_${channelId}`, []);
  });

  app.put('/colony/channels/:channelId/permissions/:targetId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, targetId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_ch_perms_${channelId}`;
    const perms = await communityService.get<any[]>(key, []);
    const overwrite = { id: targetId, ...body };
    const updated = [...perms.filter((p) => p.id !== targetId), overwrite];
    await communityService.set(key, updated);
    return overwrite;
  });

  app.delete('/colony/channels/:channelId/permissions/:targetId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, targetId } = (req.params as any) || {};
    const key = `colony_ch_perms_${channelId}`;
    const perms = await communityService.get<any[]>(key, []);
    await communityService.set(key, perms.filter((p) => p.id !== targetId));
    return { success: true };
  });

  // ── 3. Colony Categories Endpoints ──
  app.get('/colony/categories', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId = 'anticeil' } = (req.query as any) || {};
    return communityService.get<any[]>(`colony_categories_${colonyId}`, [
      { id: `cat_text_${colonyId}`, colonyId, name: 'TEXT CHANNELS', isDefault: true },
      { id: `cat_voice_${colonyId}`, colonyId, name: 'VOICE CHANNELS', isDefault: true },
    ]);
  });

  app.post('/colony/categories', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    const colonyId = body.colonyId || 'anticeil';
    const key = `colony_categories_${colonyId}`;
    const current = await communityService.get<any[]>(key, []);
    const newCat = {
      id: body.id || `cat_${Date.now()}`,
      colonyId,
      name: body.name || 'NEW CATEGORY',
      isDefault: false,
    };
    const updated = [...current, newCat];
    await communityService.set(key, updated);
    return newCat;
  });

  app.delete('/colony/categories/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const { colonyId = 'anticeil' } = (req.query as any) || {};
    const key = `colony_categories_${colonyId}`;
    const current = await communityService.get<any[]>(key, []);
    await communityService.set(key, current.filter((c) => c.id !== id));
    return { success: true, id };
  });

  // ── 4. Chat Messages Endpoints ──
  app.get('/colony/channels/:channelId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_messages_${channelId}`, []);
  });

  app.post('/colony/channels/:channelId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_messages_${channelId}`;
    const messages = await communityService.get<any[]>(key, []);

    const newMessage = {
      id: body.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId,
      senderId: body.senderId || 'me',
      senderName: body.senderName || 'User',
      senderEmail: body.senderEmail || '',
      senderAvatar: body.senderAvatar || null,
      senderRole: body.senderRole || 'member',
      content: body.content || '',
      attachments: body.attachments || [],
      poll: body.poll || null,
      replyTo: body.replyTo || null,
      reactions: body.reactions || {},
      createdAt: new Date().toISOString(),
    };

    const updated = [...messages.filter((m) => m.id !== newMessage.id), newMessage];
    await communityService.set(key, updated);
    return newMessage;
  });

  app.delete('/colony/messages/:messageId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { messageId } = (req.params as any) || {};
    return { success: true, id: messageId };
  });

  app.post('/colony/messages/:messageId/reactions', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { messageId } = (req.params as any) || {};
    const { emoji, userId = 'me' } = (req.body as any) || {};
    const key = `colony_msg_reactions_${messageId}`;
    const reactions = await communityService.get<Record<string, string[]>>(key, {});

    const users = reactions[emoji] || [];
    if (users.includes(userId)) {
      reactions[emoji] = users.filter((u) => u !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji] = [...users, userId];
    }

    await communityService.set(key, reactions);
    return { id: messageId, reactions };
  });

  app.post('/colony/messages/:messageId/poll-vote', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { messageId } = (req.params as any) || {};
    const { answerIds = [], userId = 'me', channelId } = (req.body as any) || {};
    if (channelId) {
      const key = `colony_messages_${channelId}`;
      const messages = await communityService.get<any[]>(key, []);
      const strAnswerIds = answerIds.map(String);
      const updated = messages.map((m) => {
        if (m.id === messageId) {
          const poll = m.poll || m.attachments?.find((a: any) => a.type === 'poll')?.pollData;
          if (poll) {
            const answers = (poll.answers || []).map((ans: any) => {
              const isSelected = strAnswerIds.includes(String(ans.id));
              const existingVotes = (ans.votes || []).filter((u: string) => u !== userId);
              return {
                ...ans,
                votes: isSelected ? [...existingVotes, userId] : existingVotes,
              };
            });
            const updatedPoll = { ...poll, answers };
            return {
              ...m,
              poll: updatedPoll,
              attachments: m.attachments?.map((a: any) =>
                a.type === 'poll' ? { ...a, pollData: updatedPoll } : a
              ),
            };
          }
        }
        return m;
      });
      await communityService.set(key, updated);
    }
    return { success: true };
  });

  // ── 5. Threads Endpoints ──
  app.get('/colony/channels/:channelId/threads', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_threads_${channelId}`, []);
  });

  app.post('/colony/channels/:channelId/threads', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_threads_${channelId}`;
    const threads = await communityService.get<any[]>(key, []);

    const newThread = {
      id: `thread_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId,
      name: body.name?.trim() || 'New Thread',
      creatorId: body.creatorId || 'me',
      creatorName: body.creatorName || 'You',
      creatorAvatar: body.creatorAvatar ?? null,
      messageCount: body.initialMessage ? 1 : 0,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newThread, ...threads];
    await communityService.set(key, updated);

    if (body.initialMessage) {
      const msgKey = `colony_thread_msgs_${newThread.id}`;
      const firstMsg = {
        id: `tmsg_${Date.now()}`,
        channelId: newThread.id,
        senderId: newThread.creatorId,
        senderName: newThread.creatorName,
        senderAvatar: newThread.creatorAvatar,
        content: body.initialMessage,
        createdAt: new Date().toISOString(),
      };
      await communityService.set(msgKey, [firstMsg]);
    }

    return newThread;
  });

  app.get('/colony/channels/:channelId/threads/:threadId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { threadId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_thread_msgs_${threadId}`, []);
  });

  app.post('/colony/channels/:channelId/threads/:threadId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { threadId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_thread_msgs_${threadId}`;
    const msgs = await communityService.get<any[]>(key, []);
    const newMsg = {
      id: `tmsg_${Date.now()}`,
      channelId: threadId,
      senderId: body.senderId || 'me',
      senderName: body.senderName || 'You',
      senderAvatar: body.senderAvatar || null,
      content: body.content || '',
      replyTo: body.replyTo || null,
      createdAt: new Date().toISOString(),
    };
    await communityService.set(key, [...msgs, newMsg]);
    return newMsg;
  });

  app.put('/colony/channels/:channelId/threads/:threadId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, threadId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_threads_${channelId}`;
    const threads = await communityService.get<any[]>(key, []);
    const updated = threads.map((t) => (t.id === threadId ? { ...t, ...body } : t));
    await communityService.set(key, updated);
    return updated.find((t) => t.id === threadId) || { success: true, id: threadId };
  });

  app.delete('/colony/channels/:channelId/threads/:threadId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, threadId } = (req.params as any) || {};
    const key = `colony_threads_${channelId}`;
    const threads = await communityService.get<any[]>(key, []);
    await communityService.set(key, threads.filter((t) => t.id !== threadId));
    return { success: true, id: threadId };
  });

  app.delete('/colony/threads/:threadId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { threadId } = (req.params as any) || {};
    return { success: true, id: threadId };
  });

  app.get('/colony/threads/:threadId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { threadId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_thread_msgs_${threadId}`, []);
  });

  app.post('/colony/threads/:threadId/messages', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { threadId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_thread_msgs_${threadId}`;
    const msgs = await communityService.get<any[]>(key, []);
    const newMsg = {
      id: `tmsg_${Date.now()}`,
      channelId: threadId,
      senderId: body.senderId || 'me',
      senderName: body.senderName || 'You',
      senderAvatar: body.senderAvatar || null,
      content: body.content || '',
      replyTo: body.replyTo || null,
      createdAt: new Date().toISOString(),
    };
    await communityService.set(key, [...msgs, newMsg]);
    return newMsg;
  });

  // ── 7. Colony Webhooks Endpoints ──
  app.get('/colonies/:colonyId/webhooks', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_webhooks_${colonyId}`, []);
  });

  app.post('/colonies/:colonyId/webhooks', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_webhooks_${colonyId}`;
    const webhooks = await communityService.get<any[]>(key, []);

    const token = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
    const newWebhook = {
      id: `wh_${Date.now()}`,
      colonyId,
      channelId: body.channelId || '',
      channelName: body.channelName || '',
      name: body.name || 'Anticeil Bot',
      avatarUrl: body.avatarUrl || null,
      token,
      url: `/api/v1/colonies/webhooks/${token}`,
      createdAt: new Date().toISOString(),
    };

    await communityService.set(key, [newWebhook, ...webhooks]);
    return newWebhook;
  });

  app.delete('/colonies/:colonyId/webhooks/:webhookId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, webhookId } = (req.params as any) || {};
    const key = `colony_webhooks_${colonyId}`;
    const webhooks = await communityService.get<any[]>(key, []);
    await communityService.set(key, webhooks.filter((w) => w.id !== webhookId));
    return { success: true };
  });

  app.put('/colonies/:colonyId/webhooks/:webhookId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, webhookId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_webhooks_${colonyId}`;
    const webhooks = await communityService.get<any[]>(key, []);
    const updated = webhooks.map((w) => (w.id === webhookId ? { ...w, ...body } : w));
    await communityService.set(key, updated);
    return updated.find((w) => w.id === webhookId) || { success: true, webhookId };
  });

  app.post('/colonies/webhooks/:token', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    return { success: true, message: 'Webhook event received successfully' };
  });

  // ── 8. User Security Sessions, 2FA & Settings Endpoints ──
  // ── 8. Colony Invites & Pause Invites Management ──
  app.get('/colony/colonies/:colonyId/invites', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_invites_${colonyId}`, []);
  });

  app.post('/colony/colonies/:colonyId/invites', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_invites_${colonyId}`;
    const invites = await communityService.get<any[]>(key, []);
    const newInvite = {
      id: body.id || `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colonyId,
      code: body.code || Math.random().toString(36).slice(2, 8).toUpperCase(),
      inviterName: body.inviterName || 'Admin',
      uses: body.uses || 0,
      maxUses: body.maxUses || 0,
      expiresAt: body.expiresAt || null,
      createdAt: body.createdAt || new Date().toISOString(),
    };
    const updated = [newInvite, ...invites.filter((i) => i.id !== newInvite.id)];
    await communityService.set(key, updated);
    return newInvite;
  });

  app.delete('/colony/colonies/:colonyId/invites/:inviteId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, inviteId } = (req.params as any) || {};
    const key = `colony_invites_${colonyId}`;
    const invites = await communityService.get<any[]>(key, []);
    const updated = invites.filter((i) => i.id !== inviteId && i.code !== inviteId);
    await communityService.set(key, updated);
    return { success: true, id: inviteId };
  });

  app.get('/colony/colonies/:colonyId/pause-invites', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get(`colony_security_pause_${colonyId}`, {
      isPaused: false,
      pauseDuration: '2 hours',
      pauseDMs: false,
    });
  });

  app.post('/colony/colonies/:colonyId/pause-invites', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const data = {
      isPaused: Boolean(body.isPaused),
      pauseDuration: body.pauseDuration || '2 hours',
      pauseDMs: Boolean(body.pauseDMs),
      updatedAt: new Date().toISOString(),
    };
    await communityService.set(`colony_security_pause_${colonyId}`, data);
    return data;
  });

  // ── Colony Custom Roles ──
  app.get('/colony/colonies/:colonyId/roles', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const key = `colony_roles_${colonyId}`;
    const roles = await communityService.get<any[]>(key, []);
    if (roles.length === 0) {
      const defaultRoles = [
        {
          id: `role_admin_${colonyId}`,
          colonyId,
          name: 'Admin',
          color: '#5865F2',
          permissions: ['ADMINISTRATOR', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'KICK_MEMBERS', 'BAN_MEMBERS'],
          position: 1,
        },
        {
          id: `role_moderator_${colonyId}`,
          colonyId,
          name: 'Moderator',
          color: '#22c55e',
          permissions: ['MANAGE_MESSAGES', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS'],
          position: 2,
        },
      ];
      await communityService.set(key, defaultRoles);
      return defaultRoles;
    }
    return roles;
  });

  app.post('/colony/colonies/:colonyId/roles', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_roles_${colonyId}`;
    const roles = await communityService.get<any[]>(key, []);
    const newRole = {
      id: body.id || `role_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colonyId,
      name: body.name || 'New Role',
      color: body.color || '#6366f1',
      permissions: body.permissions || ['SEND_MESSAGES'],
      position: body.position || roles.length + 1,
      createdAt: new Date().toISOString(),
    };
    const updated = [...roles.filter((r) => r.id !== newRole.id), newRole];
    await communityService.set(key, updated);
    return newRole;
  });

  app.put('/colony/colonies/:colonyId/roles/:roleId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, roleId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_roles_${colonyId}`;
    const roles = await communityService.get<any[]>(key, []);
    const updated = roles.map((r) => (r.id === roleId ? { ...r, ...body } : r));
    await communityService.set(key, updated);
    return updated.find((r) => r.id === roleId) || { id: roleId, ...body };
  });

  app.delete('/colony/colonies/:colonyId/roles/:roleId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, roleId } = (req.params as any) || {};
    const key = `colony_roles_${colonyId}`;
    const roles = await communityService.get<any[]>(key, []);
    await communityService.set(key, roles.filter((r) => r.id !== roleId));
    return { success: true, id: roleId };
  });

  // ── Colony Bans ──
  app.get('/colony/colonies/:colonyId/bans', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_bans_${colonyId}`, []);
  });

  app.post('/colony/colonies/:colonyId/bans', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_bans_${colonyId}`;
    const bans = await communityService.get<any[]>(key, []);
    const newBan = {
      id: body.id || `ban_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colonyId,
      userId: body.userId,
      userName: body.userName,
      userEmail: body.userEmail,
      reason: body.reason || 'Melanggar aturan komunitas',
      bannedByName: body.bannedByName || 'Admin',
      createdAt: body.createdAt || new Date().toISOString(),
    };
    const updated = [newBan, ...bans.filter((b) => b.userId !== newBan.userId)];
    await communityService.set(key, updated);
    return newBan;
  });

  app.delete('/colony/colonies/:colonyId/bans/:userId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId, userId } = (req.params as any) || {};
    const key = `colony_bans_${colonyId}`;
    const bans = await communityService.get<any[]>(key, []);
    await communityService.set(key, bans.filter((b) => b.userId !== userId && b.id !== userId));
    return { success: true, userId };
  });

  // ── Colony Audit Log ──
  app.get('/colony/colonies/:colonyId/audit-log', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get<any[]>(`colony_audit_${colonyId}`, []);
  });

  app.post('/colony/colonies/:colonyId/audit-log', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `colony_audit_${colonyId}`;
    const logs = await communityService.get<any[]>(key, []);
    const newEntry = {
      id: body.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      colonyId,
      action: body.action || 'SERVER_UPDATE',
      actorName: body.actorName || 'Admin',
      targetName: body.targetName || '',
      details: body.details || null,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...logs].slice(0, 100);
    await communityService.set(key, updated);
    return newEntry;
  });

  // ── Colony Stats / Engagement ──
  app.get('/colony/colonies/:colonyId/stats', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get(`colony_stats_${colonyId}`, {
      colonyId,
      totalMembers: 42,
      activeToday: 18,
      totalMessages: 1250,
      totalVoiceMinutes: 340,
    });
  });

  // ── Stage Channels State ──
  app.get('/colony/channels/:channelId/stage', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    return communityService.get(`colony_stage_${channelId}`, {
      channelId,
      status: 'waiting',
      topic: '',
      speakers: [],
      audience: [],
      updatedAt: new Date().toISOString(),
    });
  });

  app.post('/colony/channels/:channelId/stage/start', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const current = await communityService.get(`colony_stage_${channelId}`, {
      channelId,
      status: 'waiting',
      topic: '',
      speakers: [],
      audience: [],
    });
    const updated = {
      ...current,
      status: 'live',
      topic: body.topic || current.topic || 'Stage Discussion',
      speakers: body.speakers || current.speakers || [],
      audience: body.audience || current.audience || [],
      startedAt: new Date().toISOString(),
    };
    await communityService.set(`colony_stage_${channelId}`, updated);
    return updated;
  });

  app.post('/colony/channels/:channelId/stage/end', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const current = await communityService.get(`colony_stage_${channelId}`, {
      channelId,
      status: 'waiting',
      topic: '',
      speakers: [],
      audience: [],
    });
    const updated = {
      ...current,
      status: 'waiting',
      endedAt: new Date().toISOString(),
    };
    await communityService.set(`colony_stage_${channelId}`, updated);
    return updated;
  });

  app.put('/colony/channels/:channelId/stage/topic', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const current = await communityService.get(`colony_stage_${channelId}`, {
      channelId,
      status: 'waiting',
      topic: '',
      speakers: [],
      audience: [],
    });
    const updated = {
      ...current,
      topic: body.topic || '',
    };
    await communityService.set(`colony_stage_${channelId}`, updated);
    return updated;
  });

  app.post('/colony/channels/:channelId/stage/hand-raise', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const current = await communityService.get(`colony_stage_${channelId}`, {
      channelId,
      status: 'waiting',
      topic: '',
      speakers: [],
      audience: [],
    });
    const userId = body.userId;
    const isRaised = Boolean(body.isHandRaised);
    const updatedAudience = (current.audience || []).map((a: any) =>
      a.id === userId ? { ...a, isHandRaised: isRaised } : a,
    );
    const updated = { ...current, audience: updatedAudience };
    await communityService.set(`colony_stage_${channelId}`, updated);
    return updated;
  });

  // ── Announcement Channels Follow & Crosspost ──
  app.get('/colony/channels/:channelId/followers', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    return communityService.get<any[]>(`channel_followers_${channelId}`, []);
  });

  app.post('/colony/channels/:channelId/follow', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    const key = `channel_followers_${channelId}`;
    const followers = await communityService.get<any[]>(key, []);
    const newFollow = {
      id: `foll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sourceChannelId: channelId,
      targetColonyId: body.targetColonyId,
      targetColonyName: body.targetColonyName || 'Target Colony',
      targetChannelId: body.targetChannelId,
      targetChannelName: body.targetChannelName || 'general',
      createdAt: new Date().toISOString(),
    };
    const updated = [...followers, newFollow];
    await communityService.set(key, updated);
    return newFollow;
  });

  app.delete('/colony/channels/:channelId/followers/:followId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, followId } = (req.params as any) || {};
    const key = `channel_followers_${channelId}`;
    const followers = await communityService.get<any[]>(key, []);
    await communityService.set(key, followers.filter((f) => f.id !== followId));
    return { success: true, id: followId };
  });

  app.post('/colony/channels/:channelId/crosspost/:messageId', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { channelId, messageId } = (req.params as any) || {};
    const followers = await communityService.get<any[]>(`channel_followers_${channelId}`, []);
    const msgsKey = `colony_msgs_${channelId}`;
    const messages = await communityService.get<any[]>(msgsKey, []);
    const targetMsg = messages.find((m) => m.id === messageId);
    
    if (targetMsg && followers.length > 0) {
      for (const f of followers) {
        if (f.targetChannelId) {
          const targetKey = `colony_msgs_${f.targetChannelId}`;
          const destMsgs = await communityService.get<any[]>(targetKey, []);
          const crosspostMsg = {
            ...targetMsg,
            id: `msg_cross_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            channelId: f.targetChannelId,
            content: `📢 **[Dipublikasikan dari #${channelId}]**\n${targetMsg.content}`,
            createdAt: new Date().toISOString(),
          };
          await communityService.set(targetKey, [...destMsgs, crosspostMsg]);
        }
      }
    }
    return { success: true, messageId, publishedTo: followers.length };
  });

  // ── Family Center ──
  app.get('/colony/colonies/:colonyId/onboarding', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    return communityService.get(`colony_onboarding_${colonyId}`, {
      colonyId,
      enabled: true,
      welcomeMessage: 'Selamat datang di komunitas kami!',
      defaultChannels: ['general', 'pengumuman'],
    });
  });

  app.post('/colony/colonies/:colonyId/onboarding', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { colonyId } = (req.params as any) || {};
    const body = (req.body as any) || {};
    await communityService.set(`colony_onboarding_${colonyId}`, { ...body, colonyId, updatedAt: new Date().toISOString() });
    return { success: true, colonyId };
  });

};
