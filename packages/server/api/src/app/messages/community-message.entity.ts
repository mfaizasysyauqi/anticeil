import { EntitySchema } from 'typeorm'
import { CommunityChannelRow } from './community-channel.entity'
import { ApIdSchema, BaseColumnSchemaPart } from '../database/database-common'

export type CommunityMessageRow = {
    id: string
    created: string
    updated: string
    channelId: string
    senderId: string
    senderName: string
    senderEmail: string
    senderAvatar: string | null
    senderRole: string
    content: string
    attachments: object | null
    reactions: object
    isPinned: boolean
    pinnedAt: string | null
    pinnedBy: string | null
    threadId: string | null
    channel?: CommunityChannelRow
}

export const CommunityMessageEntity = new EntitySchema<CommunityMessageRow>({
    name: 'community_message',
    columns: {
        ...BaseColumnSchemaPart,
        channelId: {
            ...ApIdSchema,
            nullable: false,
        },
        senderId: {
            ...ApIdSchema,
            nullable: false,
        },
        senderName: {
            type: String,
            nullable: false,
        },
        senderEmail: {
            type: String,
            nullable: false,
        },
        senderAvatar: {
            type: String,
            nullable: true,
        },
        senderRole: {
            type: String,
            nullable: false,
            default: 'member',
        },
        content: {
            type: 'text',
            nullable: false,
        },
        attachments: {
            type: 'jsonb',
            nullable: true,
        },
        reactions: {
            type: 'jsonb',
            nullable: false,
            default: '{}',
        },
        isPinned: {
            type: Boolean,
            nullable: false,
            default: false,
        },
        pinnedAt: {
            type: 'timestamp with time zone',
            nullable: true,
        },
        pinnedBy: {
            type: String,
            nullable: true,
        },
        threadId: {
            ...ApIdSchema,
            nullable: true,
        },
    },
    indices: [
        {
            name: 'idx_community_message_channel_created',
            columns: ['channelId', 'created'],
        },
        {
            name: 'idx_community_message_channel_pinned',
            columns: ['channelId', 'isPinned'],
        },
        {
            name: 'idx_community_message_thread_created',
            columns: ['threadId', 'created'],
        },
    ],
    relations: {
        channel: {
            type: 'many-to-one',
            target: 'community_channel',
            joinColumn: {
                name: 'channelId',
                foreignKeyConstraintName: 'fk_community_message_channel_id',
            },
            onDelete: 'CASCADE',
        },
    },
})
