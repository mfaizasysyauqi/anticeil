import { EntitySchema } from 'typeorm'
import { ApIdSchema, BaseColumnSchemaPart } from '../database/database-common'

export type CommunityServerEmojiRow = {
    id: string
    created: string
    updated: string
    hubId: string
    name: string
    code: string
    url: string
    uploadedBy: string
}

export const CommunityServerEmojiEntity = new EntitySchema<CommunityServerEmojiRow>({
    name: 'community_server_emoji',
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
        code: {
            type: String,
            nullable: false,
        },
        url: {
            type: String,
            nullable: false,
        },
        uploadedBy: {
            ...ApIdSchema,
            nullable: false,
        },
    },
    indices: [
        {
            name: 'idx_community_server_emoji_hub',
            columns: ['hubId'],
        },
    ],
})
