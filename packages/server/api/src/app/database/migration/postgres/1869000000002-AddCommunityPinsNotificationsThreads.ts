import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCommunityPinsNotificationsThreads1869000000002 implements MigrationInterface {
    name = 'AddCommunityPinsNotificationsThreads1869000000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add pin and thread support columns to community_message
        await queryRunner.query(`
            ALTER TABLE "community_message"
                ADD COLUMN IF NOT EXISTS "isPinned" boolean NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS "pinnedBy" character varying,
                ADD COLUMN IF NOT EXISTS "threadId" character varying(21)
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_community_message_channel_pinned"
                ON "community_message" ("channelId", "isPinned")
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_community_message_thread_created"
                ON "community_message" ("threadId", "created")
        `)

        // 2. Create community_channel_notification table for notification settings
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "community_channel_notification" (
                "id" character varying(21) NOT NULL,
                "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "channelId" character varying(21) NOT NULL,
                "userId" character varying(21) NOT NULL,
                "level" character varying NOT NULL DEFAULT 'default',
                "isMuted" boolean NOT NULL DEFAULT false,
                "mutedUntil" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_community_channel_notification" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_community_channel_notification_unique" UNIQUE ("channelId", "userId")
            )
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_community_channel_notification_user"
                ON "community_channel_notification" ("userId")
        `)

        // 3. Create community_thread table for discussion threads
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "community_thread" (
                "id" character varying(21) NOT NULL,
                "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "channelId" character varying(21) NOT NULL,
                "name" character varying NOT NULL,
                "creatorId" character varying(21) NOT NULL,
                "creatorName" character varying NOT NULL,
                "creatorAvatar" character varying,
                "messageCount" integer NOT NULL DEFAULT 1,
                "lastMessageAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_community_thread" PRIMARY KEY ("id")
            )
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_community_thread_channel_last_message"
                ON "community_thread" ("channelId", "lastMessageAt")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "community_thread"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "community_channel_notification"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_community_message_thread_created"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_community_message_channel_pinned"`)
        await queryRunner.query(`
            ALTER TABLE "community_message"
                DROP COLUMN IF EXISTS "threadId",
                DROP COLUMN IF EXISTS "pinnedBy",
                DROP COLUMN IF EXISTS "pinnedAt",
                DROP COLUMN IF EXISTS "isPinned"
        `)
    }
}
