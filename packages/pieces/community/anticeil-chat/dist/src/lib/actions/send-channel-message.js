"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendChannelMessage = void 0;
const tslib_1 = require("tslib");
const pieces_framework_1 = require("@activepieces/pieces-framework");
const pieces_common_1 = require("@activepieces/pieces-common");
exports.sendChannelMessage = (0, pieces_framework_1.createAction)({
    name: 'send_channel_message',
    displayName: 'Kirim Pesan ke Channel',
    description: 'Kirim pesan bot otomatis ke saluran Anticeil Chat melalui Webhook URL atau ID Saluran.',
    requireAuth: false,
    props: {
        webhookUrl: pieces_framework_1.Property.ShortText({
            displayName: 'Webhook URL',
            description: 'Salin Webhook URL dari Pengaturan Saluran Anticeil Chat (contoh: https://anticeil.com/api/v1/community/webhook?channelId=ch-...&hubId=anticeil)',
            required: false,
            placeholder: 'https://anticeil.com/api/v1/community/webhook?channelId=ch-...',
        }),
        channel: pieces_framework_1.Property.ShortText({
            displayName: 'ID Saluran / Nama Channel (Opsional)',
            description: 'Opsional jika Webhook URL sudah diisi. Masukkan nama channel (contoh: general) atau ID saluran (contoh: ch-...).',
            required: false,
        }),
        channelId: pieces_framework_1.Property.ShortText({
            displayName: 'ID Saluran (Alias)',
            description: 'Opsional. Alias jika ingin mengisi parameter channelId secara spesifik.',
            required: false,
        }),
        hubId: pieces_framework_1.Property.ShortText({
            displayName: 'ID Server / Hub ID (Opsional)',
            description: 'Opsional jika Webhook URL sudah diisi. ID Server Anticeil Chat (default: anticeil).',
            required: false,
        }),
        content: pieces_framework_1.Property.LongText({
            displayName: 'Isi Pesan (Markdown)',
            description: 'Pesan yang ingin dikirim. Mendukung sintaks Markdown (bold, italic, list, link, code).',
            required: true,
        }),
        botName: pieces_framework_1.Property.ShortText({
            displayName: 'Nama Bot',
            description: 'Nama bot pengirim yang akan ditampilkan dengan badge [BOT] ungu.',
            required: false,
            defaultValue: 'Anticeil Bot',
        }),
        botAvatar: pieces_framework_1.Property.ShortText({
            displayName: 'Avatar URL',
            description: 'Opsional: URL gambar avatar bot.',
            required: false,
        }),
    },
    run(context) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const rawWebhook = (_a = context.propsValue.webhookUrl) === null || _a === void 0 ? void 0 : _a.trim();
            let channel = (_b = (context.propsValue.channel || context.propsValue.channelId || context.propsValue.channel)) === null || _b === void 0 ? void 0 : _b.trim();
            let hubId = (_c = context.propsValue.hubId) === null || _c === void 0 ? void 0 : _c.trim();
            const content = context.propsValue.content;
            const botName = context.propsValue.botName || 'Anticeil Bot';
            const botAvatar = context.propsValue.botAvatar || undefined;
            console.log('[Anticeil Chat Piece] Action execution started');
            console.log('[Anticeil Chat Piece] Received props:', {
                hasWebhookUrl: Boolean(rawWebhook),
                webhookUrl: rawWebhook ? `${rawWebhook.substring(0, 45)}...` : null,
                channel,
                hubId,
                botName,
                contentLength: (content === null || content === void 0 ? void 0 : content.length) || 0,
            });
            // Auto-extract channelId and hubId from Webhook URL query parameters if not explicitly provided
            if (rawWebhook) {
                try {
                    const parsed = new URL(rawWebhook);
                    const urlChannel = parsed.searchParams.get('channelId') || parsed.searchParams.get('channel');
                    const urlHubId = parsed.searchParams.get('hubId');
                    if (!channel && urlChannel) {
                        channel = urlChannel;
                    }
                    if (!hubId && urlHubId) {
                        hubId = urlHubId;
                    }
                    console.log('[Anticeil Chat Piece] Extracted from Webhook URL:', { channel, hubId });
                }
                catch (e) {
                    console.warn('[Anticeil Chat Piece] Could not parse Webhook URL as URL object:', e === null || e === void 0 ? void 0 : e.message);
                }
            }
            channel = channel || 'general';
            hubId = hubId || 'anticeil';
            let targetUrl;
            if (rawWebhook && (rawWebhook.startsWith('http://') || rawWebhook.startsWith('https://'))) {
                targetUrl = rawWebhook;
            }
            else {
                const baseUrl = process.env['AP_INTERNAL_URL'] ||
                    process.env['AP_FRONTEND_URL'] ||
                    process.env['FRONTEND_URL'] ||
                    'http://127.0.0.1:3000';
                targetUrl = `${baseUrl.replace(/\/+$/, '')}/api/v1/community/webhook`;
            }
            const payload = {
                channel,
                channelId: channel,
                hubId,
                content,
                botName,
                botAvatar,
            };
            // Candidate URLs for robust delivery inside Docker networks or direct HTTP
            const candidates = [];
            const internalUrl = (_d = process.env['AP_INTERNAL_URL']) === null || _d === void 0 ? void 0 : _d.replace(/\/+$/, '');
            if (targetUrl.includes('anticeil.com') || targetUrl.includes('127.0.0.1') || targetUrl.includes('localhost')) {
                const parsedPath = targetUrl.replace(/https?:\/\/[^\/]+/, '');
                if (internalUrl) {
                    candidates.push(`${internalUrl}${parsedPath}`);
                }
                candidates.push(`http://app:80${parsedPath}`);
                candidates.push(`http://activepieces-app:80${parsedPath}`);
                candidates.push(`http://127.0.0.1:8080${parsedPath}`);
            }
            candidates.push(targetUrl);
            console.log('[Anticeil Chat Piece] Final target candidates:', candidates);
            console.log('[Anticeil Chat Piece] Sending payload:', JSON.stringify(payload));
            let lastError = null;
            for (const url of candidates) {
                try {
                    console.log(`[Anticeil Chat Piece] Sending POST to: ${url}`);
                    const response = yield pieces_common_1.httpClient.sendRequest({
                        method: pieces_common_1.HttpMethod.POST,
                        url,
                        body: payload,
                        timeout: 5000,
                    });
                    console.log(`[Anticeil Chat Piece] Success response from ${url}:`, response.status, response.body);
                    return response.body || response;
                }
                catch (err) {
                    console.warn(`[Anticeil Chat Piece] Attempt to ${url} failed:`, (err === null || err === void 0 ? void 0 : err.message) || err);
                    lastError = err;
                }
            }
            console.error('[Anticeil Chat Piece] All candidate delivery attempts failed. Last error:', (lastError === null || lastError === void 0 ? void 0 : lastError.message) || lastError);
            throw lastError || new Error('Gagal mengirim webhook pesan ke Anticeil Chat');
        });
    },
});
//# sourceMappingURL=send-channel-message.js.map