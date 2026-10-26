import { EntitySchema } from 'typeorm'
import { ApIdSchema, BaseColumnSchemaPart } from '../database/database-common'

export type CommunityThreadRow = {
    id: string
    created: string
    updated: string
    channelId: string
    name: string
    creatorId: string
    creatorName: string
    creatorAvatar: string | null
    messageCount: number
    lastMessageAt: string
}

export const CommunityThreadEntity = new EntitySchema<CommunityThreadRow>({
    name: 'community_thread',
    columns: {
        ...BaseColumnSchemaPart,
        channelId: {
            ...ApIdSchema,
            nullable: false,
        },
        name: {
            type: String,
            nullable: false,
        },
        creatorId: {
            ...ApIdSchema,
            nullable: false,
        },
        creatorName: {
            type: String,
            nullable: false,
        },
        creatorAvatar: {
            type: String,
            nullable: true,
        },
        messageCount: {
            type: 'int',
            nullable: false,
            default: 1,
        },
        lastMessageAt: {
            type: 'timestamp with time zone',
            nullable: false,
            default: () => 'CURRENT_TIMESTAMP',
        },
    },
    indices: [
        {
            name: 'idx_community_thread_channel_last_message',
            columns: ['channelId', 'lastMessageAt'],
        },
    ],
})
