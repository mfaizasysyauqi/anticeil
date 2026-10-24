import {
  PieceMetadataModel,
  PieceMetadataModelSummary,
  PiecePackageInformation,
  PropertyType,
  ExecutePropsResult,
} from '@activepieces/pieces-framework';
import {
  AddPieceRequestBody,
  ApEdition,
  GetPieceRequestParams,
  GetPieceRequestQuery,
  ListPiecesRequestQuery,
  PackageType,
  PieceOptionRequest,
} from '@activepieces/shared';
import { t } from 'i18next';

import { internalErrorToast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

export const ANTICEIL_CHAT_PIECE_NAME = '@activepieces/piece-anticeil-chat';

export const ANTICEIL_CHAT_PIECE_SUMMARY: PieceMetadataModelSummary = {
  name: ANTICEIL_CHAT_PIECE_NAME,
  displayName: 'Anticeil Chat',
  description: 'Kirim pesan, notifikasi, dan bot otomatis langsung ke saluran Anticeil Chat / Messages.',
  logoUrl: 'https://cdn.activepieces.com/pieces/discord.png',
  version: '0.1.0',
  minimumSupportedRelease: '0.0.1',
  maximumSupportedRelease: '99.99.99',
  packageType: PackageType.REGISTRY,
  pieceType: 'OFFICIAL' as any,
  categories: ['COMMUNICATION' as any],
  authors: ['Anticeil Team'],
  actions: 1,
  triggers: 0,
  projectUsage: 0,
};

export const ANTICEIL_CHAT_PIECE_MODEL: PieceMetadataModel = {
  ...ANTICEIL_CHAT_PIECE_SUMMARY,
  contextInfo: undefined,
  triggers: {},
  actions: {
    send_channel_message: {
      name: 'send_channel_message',
      displayName: 'Kirim Pesan ke Channel',
      description: 'Kirim pesan bot otomatis ke saluran Anticeil Chat menggunakan Webhook URL atau ID Saluran.',
      requireAuth: false,
      props: {
        webhookUrl: {
          displayName: 'Webhook URL',
          description: 'Salin Webhook URL dari Pengaturan Saluran Anticeil Chat (contoh: https://anticeil.com/api/v1/community/webhook?channelId=ch-...)',
          type: PropertyType.SHORT_TEXT,
          required: false,
          defaultValue: '',
        },
        channelId: {
          displayName: 'ID Saluran / Nama Channel',
          description: 'ID saluran (contoh: ch-general-123) atau nama channel (contoh: general, alerts) jika tidak menggunakan URL webhook lengkap.',
          type: PropertyType.SHORT_TEXT,
          required: false,
          defaultValue: 'general',
        },
        hubId: {
          displayName: 'ID Server (Hub ID)',
          description: 'ID Server Anticeil Chat tempat saluran berada (Default: anticeil).',
          type: PropertyType.SHORT_TEXT,
          required: false,
          defaultValue: 'anticeil',
        },
        content: {
          displayName: 'Isi Pesan (Markdown)',
          description: 'Pesan yang ingin dikirim. Mendukung sintaks Markdown (bold, italic, list, link, code).',
          type: PropertyType.LONG_TEXT,
          required: true,
        },
        botName: {
          displayName: 'Nama Bot',
          description: 'Nama bot pengirim yang akan ditampilkan dengan badge [BOT] ungu.',
          type: PropertyType.SHORT_TEXT,
          required: false,
          defaultValue: 'Anticeil Bot',
        },
        botAvatar: {
          displayName: 'Avatar URL',
          description: 'Opsional: URL gambar avatar bot.',
          type: PropertyType.SHORT_TEXT,
          required: false,
        },
      },
    },
  },
};

export const piecesApi = {
  async list(request: ListPiecesRequestQuery): Promise<PieceMetadataModelSummary[]> {
    try {
      const res = await api.get<PieceMetadataModelSummary[]>('/v1/pieces', request);
      const list = Array.isArray(res) ? res : ((res as any)?.data ?? []);
      if (!list.some((p: any) => p.name === ANTICEIL_CHAT_PIECE_NAME)) {
        return [ANTICEIL_CHAT_PIECE_SUMMARY, ...list];
      }
      return list;
    } catch {
      return [ANTICEIL_CHAT_PIECE_SUMMARY];
    }
  },
  async get(
    request: GetPieceRequestParams & GetPieceRequestQuery,
  ): Promise<PieceMetadataModel> {
    if (request.name === ANTICEIL_CHAT_PIECE_NAME) {
      return ANTICEIL_CHAT_PIECE_MODEL;
    }
    return api.get<PieceMetadataModel>(`/v1/pieces/${request.name}`, {
      version: request.version ?? undefined,
      locale: request.locale ?? undefined,
      projectId: request.projectId ?? undefined,
      audience: request.audience ?? undefined,
    });
  },
  options<
    T extends
      | PropertyType.DROPDOWN
      | PropertyType.MULTI_SELECT_DROPDOWN
      | PropertyType.DYNAMIC,
  >(
    request: PieceOptionRequest,
    propertyType: T,
  ): Promise<ExecutePropsResult<T>> {
    return api
      .post<ExecutePropsResult<T>>(`/v1/pieces/options`, request)
      .catch((error) => {
        if (propertyType === PropertyType.DYNAMIC) {
          throw error;
        }
        console.error(error);
        internalErrorToast();
        const defaultStateForDropdownProperty: ExecutePropsResult<PropertyType.DROPDOWN> =
          {
            options: {
              options: [],
              disabled: true,
              placeholder: t(
                'An internal error occurred, please contact support',
              ),
            },
            type: PropertyType.DROPDOWN,
          };
        return defaultStateForDropdownProperty as ExecutePropsResult<T>;
      });
  },
  syncFromCloud() {
    return api.post<void>(`/v1/pieces/sync`, {});
  },
  async install(params: AddPieceRequestBody) {
    const formData = new FormData();
    formData.set('packageType', params.packageType);
    formData.set('pieceName', params.pieceName);
    formData.set('pieceVersion', params.pieceVersion);
    formData.set('scope', params.scope);
    if (params.packageType === PackageType.ARCHIVE) {
      const buffer = await (
        params.pieceArchive as unknown as File
      ).arrayBuffer();
      formData.append('pieceArchive', new Blob([buffer]));
    }

    return api.post<PieceMetadataModel>('/v1/pieces', formData, undefined, {
      'Content-Type': 'multipart/form-data',
    });
  },
  registry(
    release: string,
    edition: ApEdition,
  ): Promise<PiecePackageInformation[]> {
    return api.get<PiecePackageInformation[]>('/v1/pieces/registry', {
      release,
      edition,
    });
  },
  delete(id: string) {
    return api.delete(`/v1/pieces/${id}`);
  },
};
