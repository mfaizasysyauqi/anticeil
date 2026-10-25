"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pieceBundle = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const server_utils_1 = require("@activepieces/server-utils");
const shared_1 = require("@activepieces/shared");
const typeorm_1 = require("typeorm");
const file_service_1 = require("../file/file.service");
const system_1 = require("../helper/system/system");
const system_props_1 = require("../helper/system/system-props");
const piece_metadata_service_1 = require("./metadata/piece-metadata-service");
const fs = require("fs");
const path = require("path");

// Local anticeil-chat bundle paths (inside Docker container)
const ANTICEIL_CHAT_TGZ_CANDIDATES = [
    '/usr/src/app/activepieces-piece-anticeil-chat-0.1.0.tgz',
    '/usr/src/app/packages/pieces/community/anticeil-chat/activepieces-piece-anticeil-chat-0.1.0.tgz',
    path.resolve('activepieces-piece-anticeil-chat-0.1.0.tgz'),
    path.resolve('packages/pieces/community/anticeil-chat/activepieces-piece-anticeil-chat-0.1.0.tgz'),
];

function findAnticeilChatTgz() {
    for (const p of ANTICEIL_CHAT_TGZ_CANDIDATES) {
        try {
            if (fs.existsSync(p)) return p;
        } catch (_) { /* ignore */ }
    }
    return null;
}

const pieceBundle = (log) => ({
    async resolve({ name, version, archiveId, platformId, projectId }) {
        // --- ANTICEIL PATCH: Intercept anticeil-chat bundle requests ---
        if (name && name.includes('anticeil-chat')) {
            const tgzPath = findAnticeilChatTgz();
            if (tgzPath) {
                log.info({ name, version, tgzPath }, '[Anticeil pieceBundle] Serving local anticeil-chat tgz');
                return { type: 'local-file', filePath: tgzPath };
            }
            log.warn({ name, version, candidates: ANTICEIL_CHAT_TGZ_CANDIDATES }, '[Anticeil pieceBundle] anticeil-chat tgz NOT FOUND in any candidate path');
        }
        // --- END ANTICEIL PATCH ---

        if (!(0, core_utils_1.isNil)(archiveId)) {
            const file = await (0, file_service_1.fileRepo)().findOneBy({ id: archiveId, platformId, type: shared_1.FileType.PACKAGE_ARCHIVE });
            return (0, core_utils_1.isNil)(file) ? { type: 'not-found' } : { type: 'stream', archiveId };
        }
        if ((0, core_utils_1.isNil)(name) || (0, core_utils_1.isNil)(version)) {
            return { type: 'not-found' };
        }
        const metadata = await (0, piece_metadata_service_1.pieceMetadataService)(log).get({ name, version, platformId, projectId });
        if ((0, core_utils_1.isNil)(metadata)) {
            const knownToPlatform = await (0, piece_metadata_service_1.pieceRepos)().exists({
                where: [
                    { name, version, platformId },
                    { name, version, platformId: (0, typeorm_1.IsNull)() },
                ],
            });
            if (knownToPlatform) {
                return { type: 'not-found' };
            }
            return { type: 'redirect', url: npmTarballUrl({ name, version }) };
        }
        if (metadata.packageType === shared_1.PackageType.ARCHIVE && !(0, core_utils_1.isNil)(metadata.archiveId)) {
            return { type: 'stream', archiveId: metadata.archiveId };
        }
        if (metadata.pieceType === shared_1.PieceType.OFFICIAL && system_1.system.getBoolean(system_props_1.AppSystemProp.USE_CDN_FOR_BUNDLES)) {
            const cdnUrl = cdnTarballUrl({ name, version });
            if (await cdnBundleExists({ url: cdnUrl, log })) {
                return { type: 'redirect', url: cdnUrl };
            }
        }
        return { type: 'redirect', url: npmTarballUrl({ name, version }) };
    },
});
exports.pieceBundle = pieceBundle;
function cdnTarballUrl({ name, version }) {
    return `${CDN_PIECES_URL}${name.replace('/', '-')}-${version}.tgz`;
}
async function cdnBundleExists({ url, log }) {
    if (cdnVerifiedUrls.has(url)) {
        return true;
    }
    const { data: response, error } = await (0, core_utils_1.tryCatch)(() => server_utils_1.safeHttp.axios.head(url, { validateStatus: (status) => status < 500 }));
    if (error !== null) {
        log.warn({ error, url }, '[pieceBundle] CDN bundle HEAD check failed, falling back to npm');
        return false;
    }
    const exists = response.status >= 200 && response.status < 300;
    if (exists) {
        cdnVerifiedUrls.add(url);
        return true;
    }
    log.warn({ url, status: response.status }, '[pieceBundle] CDN bundle not served, falling back to npm');
    return false;
}
function npmTarballUrl({ name, version }) {
    const unscopedName = name.startsWith('@') ? name.split('/')[1] : name;
    return `${NPM_REGISTRY_URL}/${name}/-/${unscopedName}-${version}.tgz`;
}
const cdnVerifiedUrls = new Set();
const NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const CDN_PIECES_URL = 'https://cdn.activepieces.com/pieces/bundled/';
