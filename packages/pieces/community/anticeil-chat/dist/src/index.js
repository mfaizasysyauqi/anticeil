"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anticeilChat = void 0;
const pieces_framework_1 = require("@activepieces/pieces-framework");
const send_channel_message_1 = require("./lib/actions/send-channel-message");
const new_channel_message_1 = require("./lib/triggers/new-channel-message");
exports.anticeilChat = (0, pieces_framework_1.createPiece)({
    displayName: 'Anticeil Chat',
    description: 'Kirim pesan, notifikasi, dan peringatan otomatis langsung ke saluran Anticeil Chat / Messages.',
    minimumSupportedRelease: '0.88.2',
    logoUrl: 'https://cdn.activepieces.com/pieces/discord.png',
    categories: [pieces_framework_1.PieceCategory.COMMUNICATION],
    auth: undefined,
    actions: [
        send_channel_message_1.sendChannelMessage,
    ],
    authors: ['Anticeil Team'],
    triggers: [
        new_channel_message_1.newChannelMessage,
    ],
});
exports.default = exports.anticeilChat;
//# sourceMappingURL=index.js.map