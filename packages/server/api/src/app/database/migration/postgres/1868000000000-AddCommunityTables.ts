import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCommunityTables1868000000000 implements MigrationInterface {
    name = 'AddCommunityTables1868000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "community_channel" (
                "id"              character varying(21) NOT NULL,
                "created"         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated"         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "platformId"      character varying(21) NOT NULL,
                "name"            character varying NOT NULL,
                "description"     character varying,
                "category"        character varying NOT NULL DEFAULT 'CHANNELS',
                "isDirectMessage" boolean NOT NULL DEFAULT false,
                "dmPair"          character varying,
                CONSTRAINT "PK_community_channel" PRIMARY KEY ("id")
            )
        `)

        await queryRunner.query(`
            CREATE INDEX "idx_community_channel_platform"
                ON "community_channel" ("platformId", "created")
        `)
        await queryRunner.query(`
            CREATE INDEX "idx_community_channel_dm_pair"
                ON "community_channel" ("platformId", "dmPair")
        `)

        await queryRunner.query(`
            CREATE TABLE "community_message" (
                "id"           character varying(21) NOT NULL,
                "created"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "channelId"    character varying(21) NOT NULL,
                "senderId"     character varying(21) NOT NULL,
                "senderName"   character varying NOT NULL,
                "senderEmail"  character varying NOT NULL,
                "senderAvatar" character varying,
                "senderRole"   character varying NOT NULL DEFAULT 'member',
                "content"      text NOT NULL,
                "attachments"  jsonb,
                "reactions"    jsonb NOT NULL DEFAULT '{}',
                CONSTRAINT "PK_community_message" PRIMARY KEY ("id"),
                CONSTRAINT "fk_community_message_channel_id"
                    FOREIGN KEY ("channelId")
                    REFERENCES "community_channel" ("id")
                    ON DELETE CASCADE
            )
        `)

        await queryRunner.query(`
            CREATE INDEX "idx_community_message_channel_created"
                ON "community_message" ("channelId", "created")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "community_message"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "community_channel"`)
    }
}
