import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCommunityHubAndInviteTables1869000000000 implements MigrationInterface {
    name = 'AddCommunityHubAndInviteTables1869000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "community_hub" (
                "id"          character varying(21) NOT NULL,
                "created"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "ownerId"     character varying(21) NOT NULL,
                "name"        character varying NOT NULL,
                "description" character varying,
                "icon"        character varying,
                "color"       character varying,
                "inviteCode"  character varying(32) NOT NULL,
                "isPublic"    boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_community_hub" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_community_hub_invite_code" UNIQUE ("inviteCode")
            )
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_community_hub_invite_code"
                ON "community_hub" ("inviteCode")
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_community_hub_owner"
                ON "community_hub" ("ownerId")
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "community_hub_member" (
                "id"      character varying(21) NOT NULL,
                "created" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "hubId"   character varying(21) NOT NULL,
                "userId"  character varying(21) NOT NULL,
                "role"    character varying NOT NULL DEFAULT 'member',
                CONSTRAINT "PK_community_hub_member" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_community_hub_member_unique" UNIQUE ("hubId", "userId"),
                CONSTRAINT "fk_community_hub_member_hub"
                    FOREIGN KEY ("hubId")
                    REFERENCES "community_hub" ("id")
                    ON DELETE CASCADE
            )
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_community_hub_member_user"
                ON "community_hub_member" ("userId")
        `)

        await queryRunner.query(`
            ALTER TABLE "community_channel"
                ADD COLUMN IF NOT EXISTS "hubId" character varying(21)
        `)

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_community_channel_hub"
                ON "community_channel" ("hubId", "created")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_community_channel_hub"`)
        await queryRunner.query(`ALTER TABLE "community_channel" DROP COLUMN IF EXISTS "hubId"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "community_hub_member"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "community_hub"`)
    }
}
