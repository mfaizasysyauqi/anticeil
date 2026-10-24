import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUsernameToUserIdentity1869000000001 implements MigrationInterface {
    name = 'AddUsernameToUserIdentity1869000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add columns as nullable first to allow backfill
        await queryRunner.query(`
            ALTER TABLE "user_identity"
                ADD COLUMN IF NOT EXISTS "username" character varying(32),
                ADD COLUMN IF NOT EXISTS "usernameUpdatedAt" TIMESTAMP WITH TIME ZONE
        `)

        // 2. Backfill existing identities from email prefix (sanitizing special characters)
        await queryRunner.query(`
            UPDATE "user_identity"
            SET "username" = LOWER(REGEXP_REPLACE(SPLIT_PART("email", '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
            WHERE "username" IS NULL OR "username" = ''
        `)

        // 3. Fallback for any empty username
        await queryRunner.query(`
            UPDATE "user_identity"
            SET "username" = CONCAT('user_', SUBSTRING("id" FROM 1 FOR 6))
            WHERE "username" IS NULL OR "username" = ''
        `)

        // 4. Resolve any potential duplicate usernames by appending id fragment
        await queryRunner.query(`
            UPDATE "user_identity" u1
            SET "username" = CONCAT(SUBSTRING(u1."username" FROM 1 FOR 15), '_', SUBSTRING(u1."id" FROM 1 FOR 4))
            WHERE EXISTS (
                SELECT 1 FROM "user_identity" u2
                WHERE u2."username" = u1."username" AND u2."id" <> u1."id"
            )
        `)

        // 5. Enforce NOT NULL and create UNIQUE index
        await queryRunner.query(`
            ALTER TABLE "user_identity"
                ALTER COLUMN "username" SET NOT NULL
        `)

        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_identity_username"
                ON "user_identity" ("username")
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_identity_username"`)
        await queryRunner.query(`ALTER TABLE "user_identity" DROP COLUMN IF EXISTS "usernameUpdatedAt"`)
        await queryRunner.query(`ALTER TABLE "user_identity" DROP COLUMN IF EXISTS "username"`)
    }
}
