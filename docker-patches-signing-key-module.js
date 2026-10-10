"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signingKeyModule = void 0;
const signing_key_controller_1 = require("./signing-key-controller");
const signingKeyModule = async (app) => {
    // In self-hosted Anticeil, bypass platformMustHaveFeatureEnabled hook to prevent 402 FEATURE_DISABLED
    await app.register(signing_key_controller_1.signingKeyController, { prefix: '/v1/signing-keys' });
};
exports.signingKeyModule = signingKeyModule;
