import { EntitySchema } from 'typeorm'
import { ApIdSchema, BaseColumnSchemaPart } from '../database/database-common'

export type CommunityServerStickerRow = {
    id: string
    created: string
    updated: string
    hubId: string
    name: string
    url: string
    tags: string[]
    uploadedBy: string
}

export const CommunityServerStickerEntity = new EntitySchema<CommunityServerStickerRow>({
    name: 'community_server_sticker',
    columns: {
        ...BaseColumnSchemaPart,
        hubId: {
            ...ApIdSchema,
            nullable: false,
        },
        name: {
            type: String,
            nullable: false,
        },
        url: {
            type: String,
            nullable: false,
        },
        tags: {
            type: 'simple-array',
            nullable: true,
            default: [],
        },
        uploadedBy: {
            ...ApIdSchema,
            nullable: false,
        },
    },
    indices: [
        {
            name: 'idx_community_server_sticker_hub',
            columns: ['hubId'],
        },
    ],
})
