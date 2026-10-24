import { EntitySchema } from 'typeorm'
import { ApIdSchema, BaseColumnSchemaPart } from '../database/database-common'

export type CommunityHubMemberRow = {
    id: string
    created: string
    updated: string
    hubId: string
    userId: string
    role: 'owner' | 'admin' | 'member'
}

export const CommunityHubMemberEntity = new EntitySchema<CommunityHubMemberRow>({
    name: 'community_hub_member',
    columns: {
        ...BaseColumnSchemaPart,
        hubId: {
            ...ApIdSchema,
            nullable: false,
        },
        userId: {
            ...ApIdSchema,
            nullable: false,
        },
        role: {
            type: String,
            nullable: false,
            default: 'member',
        },
    },
    indices: [
        {
            name: 'idx_community_hub_member_unique',
            columns: ['hubId', 'userId'],
            unique: true,
        },
        {
            name: 'idx_community_hub_member_user',
            columns: ['userId'],
        },
    ],
})
