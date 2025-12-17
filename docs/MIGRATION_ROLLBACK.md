# Prisma Migration Rollback System

This document describes the custom migration rollback system for SwapBuds backend.

## Overview

Prisma doesn't natively support migration rollbacks. This custom system provides:

1. **Automatic rollback generation** - Analyzes `migration.sql` and generates `rollback.sql`
2. **Rollback execution** - Safely reverts migrations with proper database state management
3. **Post-migration hooks** - Auto-generates rollback files after each migration

## Quick Start

```bash
# Run migrations with automatic rollback generation
yarn migrate:dev

# List migrations and their rollback status
yarn migrate:rollback:list

# Rollback the last migration
yarn migrate:rollback:last

# Rollback a specific migration
yarn migrate:rollback 20251130070905_add_email_verification
```

## Available Scripts

| Command                            | Description                                             |
| ---------------------------------- | ------------------------------------------------------- |
| `yarn migrate:dev`                 | Run `prisma migrate dev` + auto-generate rollback files |
| `yarn migrate:rollback`            | Show rollback usage help                                |
| `yarn migrate:rollback:last`       | Rollback the most recently applied migration            |
| `yarn migrate:rollback:list`       | List all migrations with rollback availability          |
| `yarn migrate:gen-rollback <name>` | Generate rollback for specific migration                |
| `yarn migrate:gen-rollback:all`    | Generate rollback files for all missing                 |

## File Structure

Each migration folder contains:

```
prisma/migrations/
├── 20251130070905_add_email_verification/
│   ├── migration.sql      # Forward migration (Prisma-generated)
│   └── rollback.sql       # Rollback SQL (generated or manual)
├── 20251129130648_add_comment_message_version_history/
│   ├── migration.sql
│   └── rollback.sql
└── migration_lock.toml
```

## How Rollback Generation Works

The `generate-rollback.ts` script parses `migration.sql` and creates inverse operations:

### Supported Operations

| Migration SQL                  | Generated Rollback SQL                   |
| ------------------------------ | ---------------------------------------- |
| `CREATE TABLE "users"`         | `DROP TABLE IF EXISTS "users" CASCADE;`  |
| `CREATE TYPE "Status" AS ENUM` | `DROP TYPE IF EXISTS "Status";`          |
| `CREATE INDEX "idx_name"`      | `DROP INDEX IF EXISTS "idx_name";`       |
| `CREATE UNIQUE INDEX`          | `DROP INDEX IF EXISTS ...;`              |
| `ALTER TABLE ADD COLUMN`       | `ALTER TABLE DROP COLUMN IF EXISTS;`     |
| `ALTER TABLE ADD CONSTRAINT`   | `ALTER TABLE DROP CONSTRAINT IF EXISTS;` |

### Operations Requiring Manual Rollback

Some operations are destructive and cannot be auto-reversed:

| Operation              | Why Manual?                                |
| ---------------------- | ------------------------------------------ |
| `DROP TABLE`           | Original data is lost                      |
| `DROP COLUMN`          | Column data is lost                        |
| `DROP TYPE`            | Enum values are lost                       |
| `ALTER TYPE ADD VALUE` | PostgreSQL can't remove enum values easily |
| Data migrations        | Business logic required                    |

For these, the generator creates a comment placeholder:

```sql
-- ⚠️  MANUAL ROLLBACK REQUIRED: Cannot automatically recreate dropped table "legacy_users"
```

## How Rollback Execution Works

When you run `yarn migrate:rollback <migration_name>`:

1. **Verification** - Checks migration exists and is applied
2. **Rollback file check** - Ensures `rollback.sql` exists
3. **SQL execution** - Runs the rollback SQL against the database
4. **Metadata update** - Marks migration as rolled back in `_prisma_migrations` table

### Important Notes

- Rollbacks execute SQL directly against the database
- The migration folder is **preserved** (not deleted)
- The `_prisma_migrations` table is updated with `rolled_back_at` timestamp
- You can reapply the migration later with `prisma migrate dev`

## Best Practices

### 1. Always Review Generated Rollbacks

Auto-generated rollbacks may need adjustments, especially for:

- Complex migrations with data transformations
- Migrations that depend on specific data states
- Migrations with custom SQL

### 2. Test Rollbacks in Development

Before relying on rollbacks for production incidents:

```bash
# Apply migration
yarn prisma migrate dev

# Test rollback
yarn migrate:rollback:last

# Verify database state
yarn prisma studio

# Reapply migration
yarn prisma migrate dev
```

### 3. Include Data Recovery Logic

If a migration modifies data, the rollback should restore it:

```sql
-- rollback.sql

-- Restore deleted records from audit table (example)
INSERT INTO "users" SELECT * FROM "users_backup" WHERE deleted_at IS NOT NULL;

-- Remove added columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "new_feature_flag";
```

### 4. Document Complex Rollbacks

Add comments explaining the rollback logic:

```sql
-- Rollback for: add_user_roles migration
--
-- This migration:
-- 1. Added 'role' column to users
-- 2. Set default role based on legacy 'isAdmin' column
-- 3. Removed 'isAdmin' column
--
-- Rollback steps:
-- 1. Recreate 'isAdmin' column
-- 2. Restore values from 'role' column
-- 3. Remove 'role' column

ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN DEFAULT false;
UPDATE "users" SET "isAdmin" = true WHERE "role" = 'ADMIN';
ALTER TABLE "users" DROP COLUMN "role";
```

### 5. Keep Rollbacks Updated

When editing a migration (in development only), update its rollback file.

## Example Workflow

### Creating a New Migration

```bash
# 1. Make schema changes in schema.prisma
# 2. Run migration (generates migration.sql + rollback.sql)
yarn migrate:dev --name add_user_preferences

# 3. Review the generated rollback
cat prisma/migrations/*/rollback.sql

# 4. Edit if needed
code prisma/migrations/20251217.../rollback.sql
```

### Rolling Back in Development

```bash
# View available migrations
yarn migrate:rollback:list

# Output:
#   🟢 ✅ 20251130070905_add_email_verification
#   🟢 ✅ 20251129130648_add_comment_message_version_history
#   🟢 ❌ 20251129114316_add_verification_selfie  (no rollback)

# Rollback last migration
yarn migrate:rollback:last

# Verify rollback succeeded
yarn prisma studio
```

### Generating Missing Rollbacks

```bash
# Generate rollbacks for all migrations that don't have one
yarn migrate:gen-rollback:all

# Generate for specific migration
yarn migrate:gen-rollback 20251129114316_add_verification_selfie
```

## Troubleshooting

### "Migration not found in applied migrations"

The migration hasn't been applied yet. Run `prisma migrate dev` first.

### "No rollback.sql found"

Generate one with:

```bash
yarn migrate:gen-rollback <migration_name>
```

### Rollback Failed

1. Check database connection (`DATABASE_URL`)
2. Review the rollback SQL for errors
3. Check for dependent data/constraints
4. Consider manual intervention

### Cascade Issues

If rollback fails due to foreign keys, ensure CASCADE is used:

```sql
DROP TABLE IF EXISTS "child_table" CASCADE;
```

## Production Considerations

⚠️ **WARNING**: This rollback system is designed for **development use**.

For production:

1. Always backup the database before any rollback
2. Test rollbacks in staging first
3. Consider using database point-in-time recovery
4. Have a DBA review complex rollbacks
5. Document the rollback in incident response procedures

## Script Locations

- `scripts/migrate-rollback.ts` - Executes rollbacks
- `scripts/generate-rollback.ts` - Generates rollback SQL files
- `scripts/post-migrate.ts` - Post-migration hook for auto-generation

## Related Documentation

- [PRISMA_7_MIGRATION.md](./PRISMA_7_MIGRATION.md) - Prisma 7 migration guide
- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
