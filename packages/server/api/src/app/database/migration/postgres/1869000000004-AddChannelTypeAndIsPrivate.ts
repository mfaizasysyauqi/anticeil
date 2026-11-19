import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddChannelTypeAndIsPrivate1869000000004 implements MigrationInterface {
    name = 'AddChannelTypeAndIsPrivate1869000000004'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "community_channel"
            ADD COLUMN IF NOT EXISTS "type" character varying(20) NOT NULL DEFAULT 'text',
            ADD COLUMN IF NOT EXISTS "isPrivate" boolean NOT NULL DEFAULT false
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "community_channel"
            DROP COLUMN IF EXISTS "type",
            DROP COLUMN IF EXISTS "isPrivate"
        `)
    }
}
