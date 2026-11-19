import { MigrationInterface, QueryRunner } from 'typeorm'

export class DropCommunityTables1869000000005 implements MigrationInterface {
    name = 'DropCommunityTables1869000000005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE IF EXISTS "community_server_sticker" CASCADE')
        await queryRunner.query('DROP TABLE IF EXISTS "community_server_emoji" CASCADE')
        await queryRunner.query('DROP TABLE IF EXISTS "community_thread" CASCADE')
        await queryRunner.query('DROP TABLE IF EXISTS "community_channel_notification" CASCADE')
        await queryRunner.query('DROP TABLE IF EXISTS "community_message" CASCADE')
        await queryRunner.query('DROP TABLE IF EXISTS "community_channel" CASCADE')
        await queryRunner.query('DROP TABLE IF EXISTS "community_hub_member" CASCADE')
        await queryRunner.query('DROP TABLE IF EXISTS "community_hub" CASCADE')
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // Obsolete community chat feature has been moved to standalone chat.anticeil.com
    }
}
