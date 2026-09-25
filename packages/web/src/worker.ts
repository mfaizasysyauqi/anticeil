// Cloudflare Worker API & Static Asset Server for Anticeil
// Handles 100% serverless backend with Cloudflare Workers + Supabase

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  JWT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

const DEFAULT_SUPABASE_URL = 'https://orshttowaxmjegclecag.supabase.co';
const DEFAULT_SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yc2h0dG93YXhtamVnY2xlY2FnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzM5OTc0MCwiZXhwIjoyMTAyOTc1NzQwfQ.icKdcTI6nDEHrjgIOiUXaJugcmCkTPRW0FfMZd-Colo';
const DEFAULT_JWT_SECRET = 'anticeil_jwt_secret_9948271039841284';

// Simple base64url encode/decode for Web Crypto JWT
function base64UrlEncode(str: string | Uint8Array): string {
  const base64 =
    typeof str === 'string'
      ? btoa(str)
      : btoa(String.fromCharCode(...new Uint8Array(str)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return atob(base64);
}

async function signJwt(
  payload: Record<string, any>,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT', kid: '1' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${data}.${encodedSignature}`;
}

async function verifyJwt(
  token: string,
  secret: string,
): Promise<Record<string, any> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBytes = Uint8Array.from(base64UrlDecode(encodedSignature), (c) =>
      c.charCodeAt(0),
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(data),
    );
    if (!isValid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function generateId(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = new Uint8Array(21);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < 21; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

// Supabase REST Helper
async function querySupabase(
  endpoint: string,
  options: RequestInit = {},
  env: Env,
) {
  const url = `${env.SUPABASE_URL || DEFAULT_SUPABASE_URL}/rest/v1/${endpoint}`;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_SERVICE_KEY;
  const headers = new Headers(options.headers || {});
  headers.set('apikey', key);
  headers.set('Authorization', `Bearer ${key}`);
  headers.set('Content-Type', 'application/json');
  headers.set('Prefer', 'return=representation');

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Supabase error [${res.status}] ${endpoint}:`, errText);
    return null;
  }
  return res.json();
}

const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-project-id',
    },
  });
};

const DEFAULT_PLATFORM_PLAN = {
  plan: 'enterprise',
  includedCredits: 1000000,
  tablesEnabled: true,
  eventStreamingEnabled: true,
  environmentsEnabled: true,
  analyticsEnabled: true,
  showPoweredBy: false,
  auditLogEnabled: true,
  embeddingEnabled: true,
  aiProvidersEnabled: true,
  chatEnabled: true,
  agentsEnabled: true,
  workerGroupsEnabled: true,
  managePiecesEnabled: true,
  manageTemplatesEnabled: true,
  customAppearanceEnabled: true,
  billedTeamProjectsLimit: null,
  usersLimit: null,
  scheduledUsersLimit: null,
  projectRolesEnabled: true,
  globalConnectionsEnabled: true,
  customRolesEnabled: true,
  apiKeysEnabled: true,
  ssoEnabled: true,
  secretManagersEnabled: true,
  scimEnabled: true,
  licenseKey: null,
  licenseExpiresAt: null,
  projectsLimit: null,
  activeFlowsLimit: null,
  canary: false,
  customDomainsEnabled: true,
  workerGroupId: null,
  dedicatedWorkers: null,
};

const DEFAULT_PLATFORM_USAGE = {
  creditsUsed: 0,
  creditsRemaining: 1000000,
  creditsNextResetAt: null,
  appSumoAiCreditsUsed: null,
  appSumoAiCreditsRemaining: null,
  activeFlows: 0,
  teamProjects: 1,
  users: 1,
  activeUsers: 1,
  invitedSeats: 0,
};

function formatProject(p: any) {
  return {
    ...p,
    displayName: p.displayName || 'Personal Project',
    icon: p.icon || { color: 'CYAN' },
    type: p.type || 'PERSONAL',
    plan: {
      projectId: p.id,
      locked: false,
      name: 'enterprise',
      piecesFilterType: 'NONE',
      pieces: [],
      activeFlowsLimit: null,
      tasks: 1000000,
      aiCredits: 1000000,
    },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-project-id',
        },
      });
    }


    // Only intercept /api/* routes
    if (url.pathname.startsWith('/api/')) {
      const path = url.pathname.replace(/^\/api/, '');

      // 1. GET /v1/flags
      if (path === '/v1/flags' && request.method === 'GET') {
        return jsonResponse({
          USER_CREATED: true,
          SHOW_POWERED_BY_IN_FORM: false,
          CLOUDFLARE_RUNNER_ENABLED: true,
          COPILOT_ENABLED: true,
          EDITION: 'COMMUNITY',
          ENVIRONMENT: 'PRODUCTION',
          EMAIL_AUTH_ENABLED: false,
          EMAIL_CODE_AUTH_ENABLED: false,
          PASSWORD_AUTH_ENABLED: false,
          SIGN_UP_ENABLED: true,
          TELEMETRY_ENABLED: false,
          THIRD_PARTY_AUTH_PROVIDERS_TO_SHOW_MAP: {
            google: true,
            github: false,
            saml: false,
          },
          THIRD_PARTY_AUTH_PROVIDER_REDIRECT_URL:
            'https://anticeil.com/redirect',
          THEME: {
            websiteName: 'Anticeil',
            logos: {
              fullLogoUrl: '/logo.png',
              favIconUrl: '/logo.png',
              logoIconUrl: '/logo.png',
            },
            colors: {
              avatar: '#0d9488',
              'blue-link': '#0d9488',
              danger: '#ef4444',
              selection: '#0d9488',
              primary: {
                default: '#0d9488',
                dark: '#0f766e',
                light: '#2dd4bf',
                medium: '#14b8a6',
              },
              warn: {
                default: '#f59e0b',
                light: '#fbbf24',
                dark: '#d97706',
              },
              success: {
                default: '#10b981',
                light: '#34d399',
              },
            },
          },
        });
      }

      // 2. GET /v1/authn/federated/login
      if (
        path.startsWith('/v1/authn/federated/login') &&
        request.method === 'GET'
      ) {
        const clientId = env.GOOGLE_CLIENT_ID || '';
        const googleAuthUrl = new URL(
          'https://accounts.google.com/o/oauth2/v2/auth',
        );
        googleAuthUrl.searchParams.set('client_id', clientId);
        googleAuthUrl.searchParams.set(
          'redirect_uri',
          'https://anticeil.com/redirect',
        );
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('scope', 'openid email profile');
        googleAuthUrl.searchParams.set('prompt', 'select_account');

        return jsonResponse({
          loginUrl: googleAuthUrl.toString(),
        });
      }

      // 3. POST /v1/authn/federated/claim
      if (path === '/v1/authn/federated/claim' && request.method === 'POST') {
        try {
          const body = (await request.json()) as {
            code?: string;
            providerName?: string;
          };
          if (!body.code) {
            return jsonResponse({ message: 'Missing auth code' }, 400);
          }

          const clientId = env.GOOGLE_CLIENT_ID || '';
          const clientSecret = env.GOOGLE_CLIENT_SECRET || '';

          // Exchange authorization code for Google Tokens
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              code: body.code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: 'https://anticeil.com/redirect',
              grant_type: 'authorization_code',
            }),
          });

          if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('Google token exchange failed:', err);
            return jsonResponse(
              { message: 'Failed to exchange authorization code with Google' },
              401,
            );
          }

          const tokenData = (await tokenRes.json()) as {
            access_token?: string;
            id_token?: string;
          };

          // Fetch Google User Profile
          const profileRes = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
              },
            },
          );

          if (!profileRes.ok) {
            return jsonResponse(
              { message: 'Failed to fetch user profile from Google' },
              401,
            );
          }

          const profile = (await profileRes.json()) as {
            email: string;
            given_name?: string;
            family_name?: string;
            name?: string;
            picture?: string;
            sub?: string;
          };

          const email = profile.email.toLowerCase().trim();
          const firstName = profile.given_name || profile.name || 'User';
          const lastName = profile.family_name || '';

          // 1. Get or Create User Identity in Supabase
          let identities = await querySupabase(
            `user_identity?email=eq.${encodeURIComponent(email)}&select=*`,
            {},
            env,
          );
          let identity = identities?.[0];

          if (!identity) {
            const newIdentityId = generateId();
            const createdIdentities = await querySupabase(
              'user_identity',
              {
                method: 'POST',
                body: JSON.stringify({
                  id: newIdentityId,
                  email,
                  firstName,
                  lastName,
                  verified: true,
                  trackEvents: false,
                  newsLetter: false,
                  provider: 'GOOGLE',
                  imageUrl: profile.picture || null,
                  tokenVersion: generateId(),
                }),
              },
              env,
            );
            identity = createdIdentities?.[0] || {
              id: newIdentityId,
              email,
              firstName,
              lastName,
              verified: true,
            };
          }

          // 2. Get Platform
          let platforms = await querySupabase(
            'platform?select=*&limit=1',
            {},
            env,
          );
          let platform = platforms?.[0];
          if (!platform) {
            const newPlatformId = generateId();
            const createdPlatforms = await querySupabase(
              'platform',
              {
                method: 'POST',
                body: JSON.stringify({
                  id: newPlatformId,
                  name: 'Anticeil',
                  ownerId: identity.id,
                  cloudAuthEnabled: true,
                  emailAuthEnabled: false,
                  googleAuthEnabled: true,
                }),
              },
              env,
            );
            platform = createdPlatforms?.[0] || { id: newPlatformId };
          }

          // 3. Get or Create User in Platform
          let users = await querySupabase(
            `user?identityId=eq.${identity.id}&platformId=eq.${platform.id}&select=*`,
            {},
            env,
          );
          let user = users?.[0];
          if (!user) {
            const newUserId = generateId();
            const createdUsers = await querySupabase(
              'user',
              {
                method: 'POST',
                body: JSON.stringify({
                  id: newUserId,
                  identityId: identity.id,
                  platformId: platform.id,
                  status: 'ACTIVE',
                  platformRole: 'ADMIN',
                }),
              },
              env,
            );
            user = createdUsers?.[0] || {
              id: newUserId,
              identityId: identity.id,
              platformId: platform.id,
              status: 'ACTIVE',
              platformRole: 'ADMIN',
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            };
          }

          // 4. Get or Create Project
          let projects = await querySupabase(
            `project?platformId=eq.${platform.id}&ownerId=eq.${user.id}&select=*`,
            {},
            env,
          );
          let project = projects?.[0];
          if (!project) {
            const newProjectId = generateId();
            const createdProjects = await querySupabase(
              'project',
              {
                method: 'POST',
                body: JSON.stringify({
                  id: newProjectId,
                  platformId: platform.id,
                  ownerId: user.id,
                  displayName: `${firstName}'s Project`,
                  type: 'PERSONAL',
                  releasesEnabled: false,
                  icon: { color: 'CYAN' },
                }),
              },
              env,
            );
            project = createdProjects?.[0] || { id: newProjectId };
          }

          // 5. Sign JWT Token
          const jwtSecret = env.JWT_SECRET || DEFAULT_JWT_SECRET;
          const oneWeekInSeconds = 7 * 24 * 3600;
          const nowSeconds = Math.floor(Date.now() / 1000);

          const token = await signJwt(
            {
              id: user.id,
              type: 'USER',
              platform: { id: platform.id },
              projectId: project.id,
              tokenVersion: identity.tokenVersion,
              iat: nowSeconds,
              exp: nowSeconds + oneWeekInSeconds,
              iss: 'activepieces',
            },
            jwtSecret,
          );

          // Return full AuthenticationResponse
          return jsonResponse({
            id: user.id,
            email: identity.email,
            firstName: identity.firstName,
            lastName: identity.lastName,
            token,
            projectId: project.id,
            platformId: platform.id,
            status: user.status || 'ACTIVE',
            platformRole: user.platformRole || 'ADMIN',
            verified: true,
            trackEvents: false,
            newsLetter: false,
            created: user.created || new Date().toISOString(),
            updated: user.updated || new Date().toISOString(),
          });
        } catch (err: any) {
          console.error('Federated claim error:', err);
          return jsonResponse(
            { message: err?.message || 'Authentication error' },
            500,
          );
        }
      }

      // 4. GET /v1/users/me & /v1/users/:id
      if (path.startsWith('/v1/users/') && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace(/^Bearer\s+/i, '');
        if (!token) return jsonResponse({ message: 'Unauthorized' }, 401);

        const payload = await verifyJwt(
          token,
          env.JWT_SECRET || DEFAULT_JWT_SECRET,
        );
        if (!payload)
          return jsonResponse({ message: 'Invalid or expired token' }, 401);

        const targetUserId =
          path === '/v1/users/me'
            ? payload.id
            : path.replace(/^\/v1\/users\//, '').split('?')[0];

        let users = await querySupabase(
          `user?id=eq.${targetUserId}&select=*`,
          {},
          env,
        );
        let user = users?.[0];
        if (!user && targetUserId !== payload.id) {
          users = await querySupabase(
            `user?id=eq.${payload.id}&select=*`,
            {},
            env,
          );
          user = users?.[0];
        }
        if (!user) {
          // Fallback to any user if ID mismatch
          users = await querySupabase('user?select=*&limit=1', {}, env);
          user = users?.[0];
        }
        if (!user) return jsonResponse({ message: 'User not found' }, 404);

        const identities = await querySupabase(
          `user_identity?id=eq.${user.identityId}&select=*`,
          {},
          env,
        );
        const identity = identities?.[0] || {};

        return jsonResponse({
          ...user,
          email: identity.email || 'user@anticeil.com',
          firstName: identity.firstName || 'User',
          lastName: identity.lastName || '',
          platformRole: user.platformRole || 'ADMIN',
          status: user.status || 'ACTIVE',
          verified: identity.verified ?? true,
          trackEvents: false,
          newsLetter: false,
        });
      }

      // 5. GET /v1/platforms/:id
      if (path.startsWith('/v1/platforms/') && request.method === 'GET') {
        const platformId = path.replace(/^\/v1\/platforms\//, '').split('?')[0];
        let platforms = await querySupabase(
          `platform?id=eq.${platformId}&select=*`,
          {},
          env,
        );
        let platform = platforms?.[0];

        if (!platform) {
          platforms = await querySupabase('platform?select=*&limit=1', {}, env);
          platform = platforms?.[0] || {
            id: platformId,
            name: 'Anticeil',
            ownerId: 'owner',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          };
        }

        return jsonResponse({
          ...platform,
          plan: DEFAULT_PLATFORM_PLAN,
          usage: DEFAULT_PLATFORM_USAGE,
          billingEnforced: false,
          federatedAuthProviders: {
            google: true,
            github: false,
            saml: false,
          },
        });
      }

      // 6. Platform Billing
      if (path.startsWith('/v1/platform-billing/')) {
        if (path === '/v1/platform-billing/info') {
          return jsonResponse({
            plan: DEFAULT_PLATFORM_PLAN,
            usage: DEFAULT_PLATFORM_USAGE,
            customer: null,
            subscription: null,
          });
        }
        if (path === '/v1/platform-billing/plans') {
          return jsonResponse([]);
        }
        return jsonResponse({});
      }

      // 7. GET /v1/project-members/role
      if (path.startsWith('/v1/project-members/role')) {
        return jsonResponse('ADMIN');
      }

      // 8. Projects: GET /v1/projects & /v1/users/projects
      if (path === '/v1/users/projects' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace(/^Bearer\s+/i, '');
        const payload = token
          ? await verifyJwt(token, env.JWT_SECRET || DEFAULT_JWT_SECRET)
          : null;

        let projects = [];
        if (payload?.id) {
          projects =
            (await querySupabase(
              `project?ownerId=eq.${payload.id}&select=*`,
              {},
              env,
            )) || [];
        }
        if (!projects || projects.length === 0) {
          projects = (await querySupabase('project?select=*', {}, env)) || [];
        }
        return jsonResponse(projects.map(formatProject));
      }

      if (path.startsWith('/v1/projects') && request.method === 'GET') {
        const subPath = path.replace(/^\/v1\/projects/, '').split('?')[0];
        if (subPath && subPath !== '/') {
          const projectId = subPath.replace(/^\//, '');
          const projects = await querySupabase(
            `project?id=eq.${projectId}&select=*`,
            {},
            env,
          );
          if (projects && projects[0]) {
            return jsonResponse(formatProject(projects[0]));
          }
        }

        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace(/^Bearer\s+/i, '');
        const payload = token
          ? await verifyJwt(token, env.JWT_SECRET || DEFAULT_JWT_SECRET)
          : null;

        let projects = [];
        if (payload?.id) {
          projects =
            (await querySupabase(
              `project?ownerId=eq.${payload.id}&select=*`,
              {},
              env,
            )) || [];
        }
        if (!projects || projects.length === 0) {
          projects = (await querySupabase('project?select=*', {}, env)) || [];
        }

        const formatted = projects.map(formatProject);
        return jsonResponse({
          data: formatted,
          next: null,
          previous: null,
        });
      }

      // 9. AI Providers
      if (path.startsWith('/v1/ai-providers')) {
        return jsonResponse([]);
      }

      // 10. Chat & Conversations
      if (
        path.startsWith('/v1/chat') ||
        path.startsWith('/v1/conversations')
      ) {
        return jsonResponse([]);
      }

      // 11. GET /v1/flows or /v1/folders
      if (path.startsWith('/v1/flows') && request.method === 'GET') {
        const flows = await querySupabase('flow?select=*&limit=50', {}, env);
        return jsonResponse({
          data: flows || [],
          next: null,
          previous: null,
        });
      }

      if (path.startsWith('/v1/folders') && request.method === 'GET') {
        const folders = await querySupabase(
          'folder?select=*&limit=50',
          {},
          env,
        );
        return jsonResponse(folders || []);
      }

      // 12. GET /v1/pieces or /v1/pieces/stats
      if (path.startsWith('/v1/pieces')) {
        if (path.startsWith('/v1/pieces/stats')) {
          return jsonResponse({});
        }
        const pieces = await querySupabase(
          'piece_metadata?select=*&limit=100',
          {},
          env,
        );
        return jsonResponse(pieces || []);
      }

      // 13. Alerts, App Connections, etc.
      if (path.startsWith('/v1/alerts')) {
        return jsonResponse({ data: [] });
      }

      if (path.startsWith('/v1/app-connections')) {
        return jsonResponse([]);
      }

      if (path.startsWith('/v1/tags')) {
        return jsonResponse([]);
      }

      // Default empty array/object for unmatched /api/* calls
      return jsonResponse({ data: [] });
    }

    // Pass everything else to Cloudflare Static Assets SPA
    return env.ASSETS.fetch(request);
  },
};
