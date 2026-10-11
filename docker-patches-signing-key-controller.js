"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signingKeyController = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const http_status_codes_1 = require("http-status-codes");
const zod_1 = require("zod");
const fastify_security_1 = require("../core/security/authorization/fastify-security");
const signing_key_service_1 = require("./signing-key-service");
const signingKeyController = async (app) => {
    app.post('/', AddSigningKeyRequest, async (req, res) => {
        const platformId = req.principal.platform.id;
        const newSigningKey = await signing_key_service_1.signingKeyService.add({
            platformId,
            displayName: req.body.displayName,
        });
        // Fire event if applicationEvents helper is available
        try {
            const { applicationEvents } = require('../helper/application-events');
            const { ApplicationEventName } = require('@activepieces/shared');
            applicationEvents(req.log).sendUserEvent(req, {
                action: ApplicationEventName.SIGNING_KEY_CREATED,
                data: { signingKey: newSigningKey },
            });
        } catch (_) { /* optional */ }
        return res.status(http_status_codes_1.StatusCodes.CREATED).send(newSigningKey);
    });
    app.get('/', ListSigningKeysRequest, async (req) => {
        const platformId = req.principal.platform.id;
        (0, core_utils_1.assertNotNullOrUndefined)(platformId, 'platformId');
        return signing_key_service_1.signingKeyService.list({ platformId });
    });
    app.get('/:id', GetSigningKeyRequest, async (req) => {
        const platformId = req.principal.platform.id;
        (0, core_utils_1.assertNotNullOrUndefined)(platformId, 'platformId');
        const signingKey = await signing_key_service_1.signingKeyService.get({ id: req.params.id });
        if ((0, core_utils_1.isNil)(signingKey)) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
                params: { message: `SigningKey with id ${req.params.id} not found` },
            });
        }
        return signingKey;
    });
    app.delete('/:id', DeleteSigningKeyRequest, async (req, res) => {
        const platformId = req.principal.platform.id;
        (0, core_utils_1.assertNotNullOrUndefined)(platformId, 'platformId');
        await signing_key_service_1.signingKeyService.delete({ id: req.params.id, platformId });
        return res.status(http_status_codes_1.StatusCodes.OK).send();
    });
};
exports.signingKeyController = signingKeyController;
const ListSigningKeysRequest = {
    config: {
        security: fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER]),
    },
};
const AddSigningKeyRequest = {
    config: {
        security: fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER]),
    },
    schema: {
        body: shared_1.AddSigningKeyRequestBody,
    },
};
const GetSigningKeyRequest = {
    config: {
        security: fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER]),
    },
    schema: {
        params: zod_1.z.object({ id: core_utils_1.ApId }),
    },
};
const DeleteSigningKeyRequest = {
    config: {
        security: fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER]),
    },
    schema: {
        params: zod_1.z.object({ id: core_utils_1.ApId }),
    },
};
