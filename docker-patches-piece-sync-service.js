"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pieceSyncService = void 0;
const tslib_1 = require("tslib");
const core_utils_1 = require("@activepieces/core-utils");
const server_utils_1 = require("@activepieces/server-utils");
const shared_1 = require("@activepieces/shared");
const semver_1 = tslib_1.__importDefault(require("semver"));
const promise_handler_1 = require("../helper/promise-handler");
const system_1 = require("../helper/system/system");
const system_props_1 = require("../helper/system/system-props");
const common_1 = require("../helper/system-jobs/common");
const job_handlers_1 = require("../helper/system-jobs/job-handlers");
const system_job_1 = require("../helper/system-jobs/system-job");
const tool_search_flag_1 = require("../tool-search/tool-search-flag");
const tool_search_reindex_job_1 = require("../tool-search/tool-search-reindex.job");
const piece_cache_1 = require("./metadata/piece-cache");
const piece_metadata_service_1 = require("./metadata/piece-metadata-service");

const CLOUD_API_URL = 'https://cloud.activepieces.com/api/v1/pieces';
const syncMode = system_1.system.get(system_props_1.AppSystemProp.PIECES_SYNC_MODE);
const CACHE_INVALIDATION_INTERVAL_MS = 15_000;

const ANTICEIL_CHAT_METADATA = {
    name: '@activepieces/piece-anticeil-chat',
    displayName: 'Anticeil Chat',
    logoUrl: 'https://anticeil.com/logo.png',
    description: 'Kirim pesan dan notifikasi otomatis ke saluran Anticeil Chat / Messages.',
    version: '0.1.0',
    minimumSupportedRelease: '0.0.1',
    maximumSupportedRelease: '99.99.99',
    packageType: shared_1.PackageType?.REGISTRY || 'REGISTRY',
    pieceType: shared_1.PieceType?.OFFICIAL || 'OFFICIAL',
    categories: ['COMMUNICATION'],
    authors: ['Anticeil Team'],
    actions: {
        send_channel_message: {
            name: 'send_channel_message',
            displayName: 'Kirim Pesan ke Channel',
            description: 'Kirim pesan bot otomatis dengan format Markdown ke saluran obrolan Anticeil Chat.',
            requireAuth: false,
            props: {
                channel: {
                    displayName: 'Channel',
                    description: 'Nama channel (contoh: general, alerts, dev) atau ID channel.',
                    type: 'SHORT_TEXT',
                    required: true,
                    defaultValue: 'general'
                },
                content: {
                    displayName: 'Isi Pesan (Markdown)',
                    description: 'Pesan yang ingin dikirim. Mendukung format Markdown (bold, italic, list, link, code).',
                    type: 'LONG_TEXT',
                    required: true
                },
                botName: {
                    displayName: 'Nama Bot',
                    description: 'Nama bot pengirim yang akan ditampilkan dengan badge [BOT] ungu.',
                    type: 'SHORT_TEXT',
                    required: false,
                    defaultValue: 'Anticeil Bot'
                },
                botAvatar: {
                    displayName: 'Avatar URL',
                    description: 'URL gambar avatar bot.',
                    type: 'SHORT_TEXT',
                    required: false
                },
                webhookUrl: {
                    displayName: 'Custom Webhook URL',
                    description: 'Opsional: URL endpoint webhook jika workflow dijalankan di luar instance lokal. Default: http://127.0.0.1:3000/api/v1/community/webhook',
                    type: 'SHORT_TEXT',
                    required: false
                }
            }
        }
    },
    triggers: {
        new_channel_message: {
            name: 'new_channel_message',
            displayName: 'Pesan Baru di Saluran',
            description: 'Memicu alur kerja ketika pesan baru dikirim di saluran Anticeil Chat.',
            type: 'WEBHOOK',
            requireAuth: false,
            props: {
                channel: {
                    displayName: 'Filter Channel (Opsional)',
                    description: 'Nama atau ID saluran (contoh: general, alerts). Kosongkan untuk semua saluran.',
                    type: 'SHORT_TEXT',
                    required: false,
                    defaultValue: 'general'
                }
            },
            sampleData: {
                id: 'msg-example-1',
                content: 'Halo dari Anticeil Chat!',
                channel: 'general',
                hubId: 'anticeil',
                author: {
                    id: 'usr-1',
                    name: 'Faiz'
                },
                timestamp: '2026-10-24T15:00:00.000Z'
            }
        }
    }
};

async function ensureAnticeilChatPiece(log) {
    try {
        const repo = (0, piece_metadata_service_1.pieceRepos)();
        const existing = await repo.findOne({
            where: { name: ANTICEIL_CHAT_METADATA.name }
        });
        if (existing) {
            await repo.delete({ name: ANTICEIL_CHAT_METADATA.name });
        }
        log.info('[Anticeil Decoupling] Seeding native @activepieces/piece-anticeil-chat piece into database');
        await (0, piece_metadata_service_1.pieceMetadataService)(log).create({
            pieceMetadata: ANTICEIL_CHAT_METADATA,
            packageType: ANTICEIL_CHAT_METADATA.packageType,
            pieceType: ANTICEIL_CHAT_METADATA.pieceType,
            publishCacheRefresh: true,
        });
        await (0, piece_cache_1.pieceCache)(log).invalidate();
    } catch (e) {
        log.warn({ err: e?.message }, '[Anticeil Decoupling] Warning while ensuring native piece-anticeil-chat');
    }
}

const pieceSyncService = (log) => ({
    async setup() {
        await ensureAnticeilChatPiece(log);
        job_handlers_1.systemJobHandlers.registerJobHandler(common_1.SystemJobName.PIECES_SYNC, async function syncPiecesJobHandler() {
            await (0, exports.pieceSyncService)(log).sync({ publishCacheRefresh: true });
        });
        (0, promise_handler_1.rejectedPromiseHandler)((0, exports.pieceSyncService)(log).sync({ publishCacheRefresh: false }), log);
        await (0, system_job_1.systemJobsSchedule)(log).upsertJob({
            job: {
                name: common_1.SystemJobName.PIECES_SYNC,
                data: {},
                jobId: common_1.SystemJobName.PIECES_SYNC,
            },
            schedule: {
                type: 'repeated',
                cron: `${Math.floor(Math.random() * 5)} */1 * * *`,
            },
        });
    },
    async sync({ publishCacheRefresh }) {
        await ensureAnticeilChatPiece(log);
        if (syncMode !== shared_1.PieceSyncMode.OFFICIAL_AUTO) {
            log.info('[Anticeil Decoupling] Piece sync service is disabled or in manual mode');
            return;
        }
        try {
            log.info('[Anticeil Decoupling] Starting piece synchronization in Add-Only mode');
            const startTime = performance.now();
            const dbPieces = await (0, piece_metadata_service_1.pieceRepos)().find({
                select: {
                    name: true,
                    version: true,
                    pieceType: true,
                },
            });

            let cloudPieces = [];
            try {
                cloudPieces = await listCloudPieces();
            } catch (fetchErr) {
                log.warn({ err: fetchErr?.message }, '[Anticeil Decoupling] Upstream piece registry is unreachable or timed out. All local pieces remain safely available in DB.');
                return;
            }

            log.info({ dbCount: dbPieces.length, cloudCount: cloudPieces.length }, '[Anticeil Decoupling] Fetched pieces from DB and Cloud');
            const { added, fetchFailed } = await installNewPieces(cloudPieces, dbPieces, log, publishCacheRefresh);
            const deleted = await deletePiecesIfNotOnCloud(dbPieces, cloudPieces, log);

            log.info({
                added,
                fetchFailed,
                deleted,
                durationMs: Math.floor(performance.now() - startTime),
            }, '[Anticeil Decoupling] Piece synchronization completed safely');

            if ((added > 0 || deleted > 0) && (0, tool_search_flag_1.isToolSearchEnabled)()) {
                (0, promise_handler_1.rejectedPromiseHandler)((0, tool_search_reindex_job_1.toolSearchReindexJob)(log).enqueue({ type: 'all' }), log);
            }
        }
        catch (error) {
            log.error({ error }, '[Anticeil Decoupling] Error during safe piece sync');
        }
    },
});
exports.pieceSyncService = pieceSyncService;

// Anticeil Safeguard: NEVER delete any piece from local database
async function deletePiecesIfNotOnCloud(dbPieces, cloudPieces, log) {
    log.info({ existingPieceCount: dbPieces.length }, '[Anticeil Decoupling Safeguard] Preserving all existing pieces in local database (bulkDelete permanently disabled)');
    return 0;
}

async function installNewPieces(cloudPieces, dbPieces, log, _publishCacheRefresh) {
    const dbMap = new Map(dbPieces.map(dbPiece => [`${dbPiece.name}:${dbPiece.version}`, true]));
    const newPiecesToFetch = cloudPieces.filter(piece => !dbMap.has(`${piece.name}:${piece.version}`));
    const batchSize = 5;
    let added = 0;
    let fetchFailed = 0;
    let addedAtLastInvalidation = 0;
    let lastInvalidationTime = performance.now();
    for (let done = 0; done < newPiecesToFetch.length; done += batchSize) {
        const currentBatch = newPiecesToFetch.slice(done, done + batchSize);
        await Promise.all(currentBatch.map(async (piece) => {
            const queryParams = new URLSearchParams({ audience: shared_1.PieceAudienceFilter.ALL });
            if (piece.version) {
                queryParams.append('version', piece.version);
            }
            const url = `${CLOUD_API_URL}/${piece.name}?${queryParams.toString()}`;
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 8000);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timer);
                if (!response.ok) {
                    log.warn({ piece: { name: piece.name, version: piece.version }, status: response.status }, '[pieceSyncService#installNewPieces] Error reading piece metadata');
                    fetchFailed++;
                    return;
                }
                const pieceMetadata = await response.json();
                const { error } = await (0, core_utils_1.tryCatch)(() => (0, piece_metadata_service_1.pieceMetadataService)(log).create({
                    pieceMetadata,
                    packageType: pieceMetadata.packageType,
                    pieceType: pieceMetadata.pieceType,
                    publishCacheRefresh: false,
                }));
                if (error) {
                    log.debug({ piece: { name: piece.name, version: piece.version } }, '[pieceSyncService#installNewPieces] Piece already exists, skipping');
                }
                else {
                    added++;
                }
            } catch (err) {
                log.warn({ piece: { name: piece.name, version: piece.version }, err: err?.message }, '[pieceSyncService#installNewPieces] Network timeout or error');
                fetchFailed++;
            }
        }));
        if (added > addedAtLastInvalidation && performance.now() - lastInvalidationTime > CACHE_INVALIDATION_INTERVAL_MS) {
            await (0, piece_cache_1.pieceCache)(log).invalidate();
            addedAtLastInvalidation = added;
            lastInvalidationTime = performance.now();
        }
    }
    if (added > addedAtLastInvalidation) {
        await (0, piece_cache_1.pieceCache)(log).invalidate();
    }
    return { added, fetchFailed };
}

async function listCloudPieces() {
    const queryParams = new URLSearchParams();
    queryParams.append('edition', system_1.system.getEdition());
    queryParams.append('release', server_utils_1.apVersionUtil.getCurrentRelease());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(`${CLOUD_API_URL}/registry?${queryParams.toString()}`, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) {
            throw new Error(`Failed to fetch cloud pieces: ${response.status}`);
        }
        const pieces = await response.json();
        const piecesByName = (0, core_utils_1.groupBy)(pieces, p => p.name);
        const latest = [];
        const others = [];
        for (const group of Object.values(piecesByName)) {
            const sortedByVersion = sortByVersionDesc(group);
            latest.push(sortedByVersion[0]);
            others.push(...sortedByVersion.slice(1));
        }
        return [...latest, ...others];
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

function sortByVersionDesc(items) {
    return [...items].sort((a, b) => semver_1.default.rcompare(a.version, b.version));
}
