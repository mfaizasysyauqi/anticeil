import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixAgentsEnabledForAllPlatforms1867000000000 implements MigrationInterface {
    name = 'FixAgentsEnabledForAllPlatforms1867000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Migration 1751309258332 incorrectly set agentsEnabled = NOT embeddingEnabled.
        // Agents are available on all plans (including free tier), so we force it true for everyone.
        await queryRunner.query(`
            UPDATE "platform_plan"
            SET "agentsEnabled" = true
            WHERE "agentsEnabled" = false
        `)
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // No-op: we don't want to re-disable agents on rollback.
    }
}
