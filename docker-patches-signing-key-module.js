"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signingKeyModule = void 0;
const ee_authorization_1 = require("../authentication/ee-authorization");
const signing_key_controller_1 = require("./signing-key-controller");
const signingKeyModule = async (app) => {
    app.addHook('preHandler', (0, ee_authorization_1.platformMustHaveFeatureEnabled)((platform) => platform.plan.embeddingEnabled));
    await app.register(signing_key_controller_1.signingKeyController, { prefix: '/v1/signing-keys' });
};
exports.signingKeyModule = signingKeyModule;
