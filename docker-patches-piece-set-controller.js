"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pieceSetController = void 0;
const shared_1 = require("@activepieces/shared");
const http_status_codes_1 = require("http-status-codes");
const zod_1 = require("zod");
const fastify_security_1 = require("../../../core/security/authorization/fastify-security");
const piece_set_service_1 = require("./piece-set.service");
const platformAdminSecurity = fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE]);
const pieceSetController = async (app) => {
    const service = (0, piece_set_service_1.pieceSetService)(app.log);
    app.get('/', ListPieceSets, async (req) => {
        return service.list({
            platformId: req.principal.platform.id,
            cursor: req.query.cursor,
            limit: req.query.limit,
        });
    });
    app.post('/', CreatePieceSet, async (req, reply) => {
        const set = await service.create({
            platformId: req.principal.platform.id,
            ...req.body,
        });
        return reply.status(http_status_codes_1.StatusCodes.CREATED).send(set);
    });
    app.get('/:id', GetPieceSet, async (req) => {
        return service.getOne({ id: req.params.id, platformId: req.principal.platform.id });
    });
    app.post('/:id', UpdatePieceSet, async (req) => {
        return service.update({
            id: req.params.id,
            platformId: req.principal.platform.id,
            request: req.body,
        });
    });
    app.delete('/:id', DeletePieceSet, async (req, reply) => {
        await service.delete({ id: req.params.id, platformId: req.principal.platform.id });
        return reply.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
    });
    app.post('/:id/duplicate', DuplicatePieceSet, async (req, reply) => {
        const clone = await service.duplicate({ id: req.params.id, platformId: req.principal.platform.id, name: req.body.name });
        return reply.status(http_status_codes_1.StatusCodes.CREATED).send(clone);
    });
    app.post('/:id/projects', AssignProjects, async (req, reply) => {
        await service.assignProjects({
            pieceSetId: req.params.id,
            platformId: req.principal.platform.id,
            projectIds: req.body.projectIds,
        });
        return reply.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
    });
    app.delete('/:id/projects/:projectId', RemoveProjectAssignment, async (req, reply) => {
        await service.removeProjectAssignment({
            pieceSetId: req.params.id,
            platformId: req.principal.platform.id,
            projectId: req.params.projectId,
        });
        return reply.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
    });
};
exports.pieceSetController = pieceSetController;
const idParam = zod_1.z.object({ id: zod_1.z.string() });
const ListPieceSets = {
    config: { security: platformAdminSecurity },
    schema: {
        tags: ['piece-sets'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        summary: 'List piece sets for the platform',
        querystring: zod_1.z.object({
            cursor: zod_1.z.string().optional(),
            limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(10),
        }),
    },
};
const CreatePieceSet = {
    config: { security: platformAdminSecurity },
    schema: {
        tags: ['piece-sets'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        summary: 'Create a piece set',
        body: shared_1.CreatePieceSetRequestBody,
        response: { [http_status_codes_1.StatusCodes.CREATED]: zod_1.z.unknown() },
    },
};
const GetPieceSet = {
    config: { security: platformAdminSecurity },
    schema: {
        tags: ['piece-sets'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        summary: 'Get a piece set by id',
        params: idParam,
    },
};
const UpdatePieceSet = {
    config: { security: platformAdminSecurity },
    schema: {
        tags: ['piece-sets'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        summary: 'Update a piece set',
        params: idParam,
        body: shared_1.UpdatePieceSetRequestBody,
    },
};
const DeletePieceSet = {
    config: { security: platformAdminSecurity },
    schema: {
        tags: ['piece-sets'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        summary: 'Delete a piece set',
        params: idParam,
        response: { [http_status_codes_1.StatusCodes.NO_CONTENT]: zod_1.z.undefined() },
    },
};
const DuplicatePieceSet = {
    config: { security: platformAdminSecurity },
    schema: {
        tags: ['piece-sets'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        summary: 'Duplicate a piece set',
        params: idParam,
        body: shared_1.DuplicatePieceSetRequestBody,
        response: { [http_status_codes_1.StatusCodes.CREATED]: zod_1.z.unknown() },
    },
};
const AssignProjects = {
    config: { security: platformAdminSecurity },
    schema: {
        tags: ['piece-sets'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        summary: 'Assign projects to a piece set',
        params: idParam,
        body: shared_1.AssignProjectsRequestBody,
        response: { [http_status_codes_1.StatusCodes.NO_CONTENT]: zod_1.z.undefined() },
    },
};
const RemoveProjectAssignment = {
    config: { security: platformAdminSecurity },
    schema: {
        tags: ['piece-sets'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        summary: 'Remove a project from a piece set',
        params: zod_1.z.object({ id: zod_1.z.string(), projectId: zod_1.z.string() }),
        response: { [http_status_codes_1.StatusCodes.NO_CONTENT]: zod_1.z.undefined() },
    },
};
