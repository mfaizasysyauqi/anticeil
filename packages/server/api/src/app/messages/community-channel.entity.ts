import { EntitySchema } from 'typeorm'
import { ApIdSchema, BaseColumnSchemaPart } from '../database/database-common'

export type CommunityChannelRow = {
    id: string
    created: string
    updated: string
    platformId: string
    hubId: string | null
    name: string
    description: string
    category: 'CHANNELS' | 'DIRECT MESSAGES'
    isDirectMessage: boolean
    // For DMs: the two user IDs joined by `:`
    dmPair: string | null
}

export const CommunityChannelEntity = new EntitySchema<CommunityChannelRow>({
    name: 'community_channel',
    columns: {
        ...BaseColumnSchemaPart,
        platformId: {
            ...ApIdSchema,
            nullable: false,
        },
        hubId: {
            ...ApIdSchema,
            nullable: true,
        },
        name: {
            type: String,
            nullable: false,
        },
        description: {
            type: String,
            nullable: true,
        },
        category: {
            type: String,
            nullable: false,
            default: 'CHANNELS',
        },
        isDirectMessage: {
            type: Boolean,
            nullable: false,
            default: false,
        },
        dmPair: {
            type: String,
            nullable: true,
        },
    },
    indices: [
        {
            name: 'idx_community_channel_platform',
            columns: ['platformId', 'created'],
        },
        {
            name: 'idx_community_channel_hub',
            columns: ['hubId', 'created'],
        },
        {
            name: 'idx_community_channel_dm_pair',
            columns: ['platformId', 'dmPair'],
        },
    ],
})
