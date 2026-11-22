import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { securityAccess } from '../../core/security/authorization/fastify-security';
import { communityService } from '../community.service';

export const communityUserController: FastifyPluginAsyncZod = async (app) => {
  // ── Profile Endpoints ──
  app.get('/users/me/profile', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('user_profile_me', {
      bio: '',
      pronouns: '',
      bannerColor: '#5c4d44',
      statusThought: '',
      widgets: {
        showActivity: true,
        showConnections: true,
      },
    });
  });

  app.put('/users/me/profile', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const current = await communityService.get('user_profile_me', {});
    const updated = { ...current, ...(req.body as any) };
    return communityService.set('user_profile_me', updated);
  });

  // ── User Sessions Endpoints ──
  app.get('/users/me/sessions', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get<any[]>('user_sessions_me', [
      {
        id: 'sess_current',
        deviceName: 'Windows PC (Current)',
        deviceType: 'desktop',
        platform: 'windows',
        browser: 'Chrome / Desktop Client',
        os: 'Windows 11',
        ipAddress: '127.0.0.1',
        location: 'Indonesia',
        lastActive: 'Aktif Sekarang',
        isCurrent: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  app.delete('/users/me/sessions/:id', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const { id } = (req.params as any) || {};
    const current = await communityService.get<any[]>('user_sessions_me', []);
    await communityService.set('user_sessions_me', current.filter((s) => s.id !== id));
    return { success: true };
  });

  app.post('/users/me/sessions/revoke-others', {
    config: { security: securityAccess.public() },
  }, async () => {
    const current = await communityService.get<any[]>('user_sessions_me', []);
    await communityService.set('user_sessions_me', current.filter((s) => s.isCurrent));
    return { success: true };
  });

  // ── Two-Factor Authentication (2FA) Endpoints ──
  app.get('/users/me/2fa/status', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('user_2fa_status_me', {
      isEnabled: false,
      enabledAt: null,
      hasBackupCodes: false,
      backupCodesRemaining: 0,
    });
  });

  app.post('/users/me/2fa/enable', {
    config: { security: securityAccess.public() },
  }, async () => {
    const state = {
      isEnabled: true,
      enabledAt: new Date().toISOString(),
      hasBackupCodes: true,
      backupCodesRemaining: 10,
    };
    await communityService.set('user_2fa_status_me', state);
    return { success: true, ...state };
  });

  app.post('/users/me/2fa/disable', {
    config: { security: securityAccess.public() },
  }, async () => {
    const state = {
      isEnabled: false,
      enabledAt: null,
      hasBackupCodes: false,
      backupCodesRemaining: 0,
    };
    await communityService.set('user_2fa_status_me', state);
    return { success: true, ...state };
  });

  app.post('/users/me/2fa/backup-codes/regenerate', {
    config: { security: securityAccess.public() },
  }, async () => {
    return {
      success: true,
      backupCodes: Array.from({ length: 10 }, () => Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()),
    };
  });

  // ── User Settings Preferences Endpoints ──
  app.get('/users/me/settings', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('user_settings_preferences_me', {
      theme: 'dark',
      soundEnabled: true,
      desktopNotifications: true,
      language: 'id',
      compactMode: false,
    });
  });

  app.put('/users/me/settings', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const current = await communityService.get('user_settings_preferences_me', {});
    const updated = { ...current, ...(req.body as any) };
    await communityService.set('user_settings_preferences_me', updated);
    return updated;
  });

  // ── Family Center Endpoints ──
  app.get('/users/me/family-center', {
    config: { security: securityAccess.public() },
  }, async () => {
    return communityService.get('user_family_center_me', {
      familyMembers: [],
      activitySummary: {
        totalFriends: 0,
        serversJoined: 0,
        voiceMinutes: 0,
      },
    });
  });

  app.put('/users/me/family-center', {
    config: { security: securityAccess.public() },
  }, async (req) => {
    const body = (req.body as any) || {};
    await communityService.set('user_family_center_me', body);
    return { success: true, ...body };
  });
};
