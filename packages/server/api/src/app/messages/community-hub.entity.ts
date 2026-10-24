import { EntitySchema } from 'typeorm'
import { ApIdSchema, BaseColumnSchemaPart } from '../database/database-common'

export type CommunityHubRow = {
    id: string
    created: string
    updated: string
    ownerId: string
    name: string
    description: string | null
    icon: string | null
    color: string | null
    inviteCode: string
    isPublic: boolean
}

export const CommunityHubEntity = new EntitySchema<CommunityHubRow>({
    name: 'community_hub',
    columns: {
        ...BaseColumnSchemaPart,
        ownerId: {
            ...ApIdSchema,
            nullable: false,
        },
        name: {
            type: String,
            nullable: false,
        },
        description: {
            type: String,
            nullable: true,
        },
        icon: {
            type: String,
            nullable: true,
        },
        color: {
            type: String,
            nullable: true,
        },
        inviteCode: {
            type: String,
            length: 32,
            unique: true,
            nullable: false,
        },
        isPublic: {
            type: Boolean,
            nullable: false,
            default: true,
        },
    },
    indices: [
        {
            name: 'idx_community_hub_invite_code',
            columns: ['inviteCode'],
            unique: true,
        },
        {
            name: 'idx_community_hub_owner',
            columns: ['ownerId'],
        },
    ],
})
