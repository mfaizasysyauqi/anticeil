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
            description: 'Salin Webhook URL dari Pengaturan Saluran Anticeil Chat (contoh: https://anticeil.com/api/v1/community/webhook?channelId=ch-...)',
            required: false,
            placeholder: 'https://anticeil.com/api/v1/community/webhook?channelId=ch-...',
        }),
        channel: pieces_framework_1.Property.ShortText({
            displayName: 'Channel ID / Nama Saluran',
            description: 'ID Saluran atau nama saluran jika tidak menggunakan Webhook URL lengkap (contoh: general atau ch-general-123).',
            required: false,
            defaultValue: 'general',
        }),
        hubId: pieces_framework_1.Property.ShortText({
            displayName: 'ID Server (Hub ID)',
            description: 'ID Server Anticeil Chat (Default: anticeil).',
            required: false,
            defaultValue: 'anticeil',
            advanced: true,
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
            var _a;
            const rawWebhook = (_a = context.propsValue.webhookUrl) === null || _a === void 0 ? void 0 : _a.trim();
            const channel = context.propsValue.channel || 'general';
            const hubId = context.propsValue.hubId || 'anticeil';
            const content = context.propsValue.content;
            const botName = context.propsValue.botName || 'Anticeil Bot';
            const botAvatar = context.propsValue.botAvatar || undefined;
            let targetUrl;
            if (rawWebhook && (rawWebhook.startsWith('http://') || rawWebhook.startsWith('https://'))) {
                targetUrl = rawWebhook;
            }
            else {
                const baseUrl = process.env['AP_FRONTEND_URL'] ||
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
            // Candidate URLs: if inside Docker network on Oracle VM, prioritize direct local app container address
            const candidates = [];
            if (targetUrl.includes('anticeil.com')) {
                const parsedPath = targetUrl.replace(/https?:\/\/[^\/]+/, '');
                candidates.push(`http://activepieces-app:80${parsedPath}`);
                candidates.push(`http://127.0.0.1:8080${parsedPath}`);
            }
            candidates.push(targetUrl);
            let lastError = null;
            for (const url of candidates) {
                try {
                    const response = yield pieces_common_1.httpClient.sendRequest({
                        method: pieces_common_1.HttpMethod.POST,
                        url,
                        body: payload,
                        timeout: 8000,
                    });
                    return response.body || response;
                }
                catch (err) {
                    lastError = err;
                }
            }
            throw lastError || new Error('Gagal mengirim webhook pesan');
        });
    },
});
//# sourceMappingURL=send-channel-message.js.map