import { EntitySchema } from 'typeorm'
import { ApIdSchema, BaseColumnSchemaPart } from '../database/database-common'

export type CommunityChannelNotificationRow = {
    id: string
    created: string
    updated: string
    channelId: string
    userId: string
    level: 'default' | 'all' | 'mentions' | 'nothing'
    isMuted: boolean
    mutedUntil: string | null
}

export const CommunityChannelNotificationEntity = new EntitySchema<CommunityChannelNotificationRow>({
    name: 'community_channel_notification',
    columns: {
        ...BaseColumnSchemaPart,
        channelId: {
            ...ApIdSchema,
            nullable: false,
        },
        userId: {
            ...ApIdSchema,
            nullable: false,
        },
        level: {
            type: String,
            nullable: false,
            default: 'default',
        },
        isMuted: {
            type: Boolean,
            nullable: false,
            default: false,
        },
        mutedUntil: {
            type: 'timestamp with time zone',
            nullable: true,
        },
    },
    indices: [
        {
            name: 'idx_community_channel_notification_unique',
            columns: ['channelId', 'userId'],
            unique: true,
        },
    ],
})
