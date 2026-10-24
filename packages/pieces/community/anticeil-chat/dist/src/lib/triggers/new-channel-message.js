"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newChannelMessage = void 0;
const tslib_1 = require("tslib");
const pieces_framework_1 = require("@activepieces/pieces-framework");
exports.newChannelMessage = (0, pieces_framework_1.createTrigger)({
    name: 'new_channel_message',
    displayName: 'Pesan Baru di Saluran',
    description: 'Memicu alur kerja ketika pesan baru dikirim atau diterima di saluran Anticeil Chat.',
    props: {
        channel: pieces_framework_1.Property.ShortText({
            displayName: 'Filter Saluran / Channel (Opsional)',
            description: 'Nama atau ID saluran (contoh: halo atau ch-mvmmfi3o-halo). Kosongkan untuk menerima pesan dari semua saluran.',
            required: false,
        }),
        hubId: pieces_framework_1.Property.ShortText({
            displayName: 'Filter ID Server / Hub ID (Opsional)',
            description: 'ID Server Anticeil Chat tempat saluran berada. Kosongkan untuk menerima dari semua server.',
            required: false,
        }),
    },
    type: pieces_framework_1.TriggerStrategy.WEBHOOK,
    sampleData: {
        id: 'msg-example-1',
        content: 'Halo dari Anticeil Chat!',
        channel: 'general',
        channelId: 'general',
        hubId: 'anticeil',
        author: {
            id: 'usr-1',
            name: 'Faiz',
        },
        created_at: '2026-10-24T15:00:00.000Z',
    },
    onEnable() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { });
    },
    onDisable() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { });
    },
    test(context) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const channel = ((_a = context.propsValue.channel) === null || _a === void 0 ? void 0 : _a.trim()) || 'halo';
            const hubId = ((_b = context.propsValue.hubId) === null || _b === void 0 ? void 0 : _b.trim()) || 'anticeil';
            return [
                {
                    id: `msg-sample-${Date.now().toString(36)}`,
                    content: '👋 Halo! Ini adalah contoh data pesan dari Anticeil Chat untuk pengujian alur.',
                    channel,
                    channelId: channel,
                    hubId,
                    author: {
                        id: 'usr-bot-sample',
                        name: 'Pengguna Anticeil',
                    },
                    created_at: new Date().toISOString(),
                },
            ];
        });
    },
    run(context) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const payload = context.payload.body;
            const filterChannel = (_a = context.propsValue.channel) === null || _a === void 0 ? void 0 : _a.trim();
            const filterHubId = (_b = context.propsValue.hubId) === null || _b === void 0 ? void 0 : _b.trim();
            if (filterChannel &&
                (payload === null || payload === void 0 ? void 0 : payload.channel) &&
                payload.channel !== filterChannel &&
                (payload === null || payload === void 0 ? void 0 : payload.channelId) !== filterChannel) {
                return [];
            }
            if (filterHubId &&
                (payload === null || payload === void 0 ? void 0 : payload.hubId) &&
                payload.hubId !== filterHubId) {
                return [];
            }
            return [payload];
        });
    },
});
//# sourceMappingURL=new-channel-message.js.map