import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCommunityServerEmojiAndSticker1869000000003 implements MigrationInterface {
    name = 'AddCommunityServerEmojiAndSticker1869000000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "community_server_emoji" (
                "id"           character varying(21) NOT NULL,
                "created"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "hubId"        character varying(21) NOT NULL,
                "name"         character varying(100) NOT NULL,
                "code"         character varying(120) NOT NULL,
                "url"          character varying(2048) NOT NULL,
                "uploadedBy"   character varying(21) NOT NULL,
                CONSTRAINT "pk_community_server_emoji" PRIMARY KEY ("id")
            )
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_community_server_emoji_hub"
            ON "community_server_emoji" ("hubId")
        `)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "community_server_sticker" (
                "id"           character varying(21) NOT NULL,
                "created"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "hubId"        character varying(21) NOT NULL,
                "name"         character varying(100) NOT NULL,
                "url"          character varying(2048) NOT NULL,
                "tags"         text NOT NULL DEFAULT '',
                "uploadedBy"   character varying(21) NOT NULL,
                CONSTRAINT "pk_community_server_sticker" PRIMARY KEY ("id")
            )
        `)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_community_server_sticker_hub"
            ON "community_server_sticker" ("hubId")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_community_server_sticker_hub"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "community_server_sticker"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_community_server_emoji_hub"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "community_server_emoji"`)
    }
}
