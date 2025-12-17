import {
  generateRollbackSql,
  parseAlterEnumAddValue,
  parseAlterTableAddColumn,
  parseAlterTableAddConstraint,
  parseAlterTableAddForeignKey,
  parseAlterTableDropColumn,
  parseCompoundAlterTable,
  parseCreateEnum,
  parseCreateIndex,
  parseCreateTable,
  parseDropEnum,
  parseDropForeignKey,
  parseDropIndex,
  parseDropTable,
  parseStatement,
  processMigrationForCatalog,
  SchemaCatalog,
} from './generate-rollback';

describe('generate-rollback', () => {
  // Helper to create an empty catalog
  const createEmptyCatalog = (): SchemaCatalog => ({
    columns: new Map(),
    indexes: new Map(),
    foreignKeys: new Map(),
    enums: new Map(),
  });

  describe('parseCreateTable', () => {
    it('should generate DROP TABLE for CREATE TABLE', () => {
      const result = parseCreateTable('CREATE TABLE "users" (id TEXT)');
      expect(result).toBe('DROP TABLE IF EXISTS "users" CASCADE;');
    });

    it('should handle table names without quotes', () => {
      const result = parseCreateTable('CREATE TABLE users (id TEXT)');
      expect(result).toBe('DROP TABLE IF EXISTS "users" CASCADE;');
    });

    it('should return null for non-CREATE TABLE statement', () => {
      const result = parseCreateTable('ALTER TABLE "users" ADD COLUMN "name"');
      expect(result).toBeNull();
    });
  });

  describe('parseCreateEnum', () => {
    it('should generate DROP TYPE for CREATE TYPE ... AS ENUM', () => {
      const result = parseCreateEnum(
        "CREATE TYPE \"ItemStatus\" AS ENUM ('ACTIVE', 'SOLD')",
      );
      expect(result).toBe('DROP TYPE IF EXISTS "ItemStatus";');
    });

    it('should return null for non-enum CREATE TYPE', () => {
      const result = parseCreateEnum('CREATE TYPE "MyType" AS (a INT)');
      expect(result).toBeNull();
    });
  });

  describe('parseCreateIndex', () => {
    it('should generate DROP INDEX for CREATE INDEX', () => {
      const result = parseCreateIndex(
        'CREATE INDEX "users_email_idx" ON "users"("email")',
      );
      expect(result).toBe('DROP INDEX IF EXISTS "users_email_idx";');
    });

    it('should handle CREATE UNIQUE INDEX', () => {
      const result = parseCreateIndex(
        'CREATE UNIQUE INDEX "users_email_key" ON "users"("email")',
      );
      expect(result).toBe('DROP INDEX IF EXISTS "users_email_key";');
    });
  });

  describe('parseAlterTableAddColumn', () => {
    it('should generate DROP COLUMN for ADD COLUMN', () => {
      const result = parseAlterTableAddColumn(
        'ALTER TABLE "users" ADD COLUMN "name" TEXT NOT NULL',
      );
      expect(result).toBe('ALTER TABLE "users" DROP COLUMN IF EXISTS "name";');
    });

    it('should handle multiple ADD COLUMN in one statement', () => {
      const result = parseAlterTableAddColumn(
        'ALTER TABLE "users" ADD COLUMN "firstName" TEXT, ADD COLUMN "lastName" TEXT',
      );
      expect(result).toContain('DROP COLUMN IF EXISTS "firstName"');
      expect(result).toContain('DROP COLUMN IF EXISTS "lastName"');
    });
  });

  describe('parseAlterTableDropColumn', () => {
    it('should generate ADD COLUMN with definition from catalog', () => {
      const catalog = createEmptyCatalog();
      catalog.columns.set('users.name', {
        table: 'users',
        column: 'name',
        definition: "TEXT NOT NULL DEFAULT ''",
        addedIn: '20251120000000_initial',
      });

      const result = parseAlterTableDropColumn(
        'ALTER TABLE "users" DROP COLUMN "name"',
        catalog,
      );
      expect(result).toContain('ADD COLUMN "name" TEXT NOT NULL DEFAULT \'\'');
      expect(result).toContain('originally defined in 20251120000000_initial');
    });

    it('should generate warning when column not in catalog', () => {
      const result = parseAlterTableDropColumn(
        'ALTER TABLE "users" DROP COLUMN "unknown"',
        createEmptyCatalog(),
      );
      expect(result).toContain('⚠️');
      expect(result).toContain('Column definition not found');
    });
  });

  describe('parseDropIndex', () => {
    it('should recreate index from catalog', () => {
      const catalog = createEmptyCatalog();
      catalog.indexes.set('users_email_idx', {
        name: 'users_email_idx',
        createStatement: 'CREATE INDEX "users_email_idx" ON "users"("email");',
        addedIn: '20251120000000_initial',
      });

      const result = parseDropIndex('DROP INDEX "users_email_idx"', catalog);
      expect(result).toContain(
        'CREATE INDEX "users_email_idx" ON "users"("email")',
      );
    });

    it('should handle DROP INDEX IF EXISTS', () => {
      const catalog = createEmptyCatalog();
      catalog.indexes.set('my_index', {
        name: 'my_index',
        createStatement: 'CREATE INDEX "my_index" ON "items"("status");',
        addedIn: '20251120000000_initial',
      });

      const result = parseDropIndex('DROP INDEX IF EXISTS "my_index"', catalog);
      expect(result).toContain('CREATE INDEX "my_index"');
    });
  });

  describe('parseDropForeignKey', () => {
    it('should recreate foreign key from catalog', () => {
      const catalog = createEmptyCatalog();
      catalog.foreignKeys.set('items_userId_fkey', {
        name: 'items_userId_fkey',
        table: 'items',
        createStatement:
          'ALTER TABLE "items" ADD CONSTRAINT "items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;',
        addedIn: '20251120000000_initial',
      });

      const result = parseDropForeignKey(
        'ALTER TABLE "items" DROP CONSTRAINT "items_userId_fkey"',
        catalog,
      );
      expect(result).toContain('ADD CONSTRAINT "items_userId_fkey"');
      expect(result).toContain('FOREIGN KEY ("userId")');
    });
  });

  describe('parseAlterTableAddConstraint', () => {
    it('should generate DROP CONSTRAINT', () => {
      const result = parseAlterTableAddConstraint(
        'ALTER TABLE "items" ADD CONSTRAINT "items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id")',
      );
      expect(result).toBe(
        'ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_userId_fkey";',
      );
    });
  });

  describe('parseAlterTableAddForeignKey', () => {
    it('should generate DROP CONSTRAINT for FK with CASCADE', () => {
      const result = parseAlterTableAddForeignKey(
        'ALTER TABLE "items" ADD CONSTRAINT "items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE',
      );
      expect(result).toBe(
        'ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_userId_fkey";',
      );
    });

    it('should generate DROP CONSTRAINT for FK with SET NULL', () => {
      const result = parseAlterTableAddForeignKey(
        'ALTER TABLE "items" ADD CONSTRAINT "items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE',
      );
      expect(result).toBe(
        'ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_userId_fkey";',
      );
    });
  });

  describe('parseDropTable', () => {
    it('should generate manual rollback warning', () => {
      const result = parseDropTable('DROP TABLE "users"');
      expect(result).toContain('⚠️  MANUAL ROLLBACK REQUIRED');
      expect(result).toContain('users');
    });
  });

  describe('parseDropEnum', () => {
    it('should generate manual rollback warning', () => {
      const result = parseDropEnum('DROP TYPE "ItemStatus"');
      expect(result).toContain('⚠️  MANUAL ROLLBACK REQUIRED');
    });
  });

  describe('parseAlterEnumAddValue', () => {
    it('should generate warning about enum value removal', () => {
      const result = parseAlterEnumAddValue(
        'ALTER TYPE "ItemStatus" ADD VALUE \'ARCHIVED\'',
      );
      expect(result).toContain('⚠️  MANUAL ROLLBACK REQUIRED');
      expect(result).toContain("'ARCHIVED'");
    });
  });

  describe('parseCompoundAlterTable', () => {
    it('should handle DROP NOT NULL', () => {
      const result = parseCompoundAlterTable(
        'ALTER TABLE "trades" ALTER COLUMN "itemOfferedId" DROP NOT NULL',
      );
      expect(result).toBe(
        'ALTER TABLE "trades" ALTER COLUMN "itemOfferedId" SET NOT NULL;',
      );
    });

    it('should handle SET NOT NULL', () => {
      const result = parseCompoundAlterTable(
        'ALTER TABLE "trades" ALTER COLUMN "itemOfferedId" SET NOT NULL',
      );
      expect(result).toBe(
        'ALTER TABLE "trades" ALTER COLUMN "itemOfferedId" DROP NOT NULL;',
      );
    });

    it('should handle multiple ALTER COLUMN operations', () => {
      const result = parseCompoundAlterTable(
        'ALTER TABLE "trades" ALTER COLUMN "col1" DROP NOT NULL, ALTER COLUMN "col2" DROP NOT NULL',
      );
      expect(result).toContain('"col1" SET NOT NULL');
      expect(result).toContain('"col2" SET NOT NULL');
    });

    it('should handle DROP DEFAULT with catalog lookup', () => {
      const catalog = createEmptyCatalog();
      catalog.columns.set('users.status', {
        table: 'users',
        column: 'status',
        definition: "TEXT NOT NULL DEFAULT 'ACTIVE'",
        addedIn: '20251120000000_initial',
      });

      const result = parseCompoundAlterTable(
        'ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT',
        catalog,
      );
      expect(result).toContain("SET DEFAULT 'ACTIVE'");
    });

    it('should handle SET DEFAULT', () => {
      const result = parseCompoundAlterTable(
        'ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT \'INACTIVE\'',
      );
      expect(result).toBe(
        'ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;',
      );
    });

    it('should handle ALTER COLUMN TYPE with catalog lookup', () => {
      const catalog = createEmptyCatalog();
      catalog.columns.set('items.price', {
        table: 'items',
        column: 'price',
        definition: 'INTEGER NOT NULL',
        addedIn: '20251120000000_initial',
      });

      const result = parseCompoundAlterTable(
        'ALTER TABLE "items" ALTER COLUMN "price" TYPE DECIMAL(10,2)',
        catalog,
      );
      expect(result).toContain('Restore previous column type');
      expect(result).toContain('INTEGER NOT NULL');
    });
  });

  describe('parseStatement', () => {
    it('should parse CREATE TABLE statement', () => {
      const result = parseStatement('CREATE TABLE "users" (id TEXT)');
      expect(result?.type).toBe('CREATE TABLE');
      expect(result?.rollback).toContain('DROP TABLE');
    });

    it('should parse CREATE INDEX statement', () => {
      const result = parseStatement('CREATE INDEX "idx" ON "users"("email")');
      expect(result?.type).toBe('CREATE INDEX');
    });

    it('should parse ALTER TABLE ADD COLUMN', () => {
      const result = parseStatement(
        'ALTER TABLE "users" ADD COLUMN "name" TEXT',
      );
      expect(result?.type).toBe('ALTER TABLE ADD COLUMN');
    });

    it('should parse ALTER TABLE ALTER COLUMN', () => {
      const result = parseStatement(
        'ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL',
      );
      expect(result?.type).toBe('ALTER TABLE ALTER COLUMN');
    });

    it('should parse ALTER TYPE RENAME TO', () => {
      const result = parseStatement(
        'ALTER TYPE "Language_old" RENAME TO "Language"',
      );
      expect(result?.type).toBe('ALTER TYPE RENAME');
      expect(result?.rollback).toBe(
        'ALTER TYPE "Language" RENAME TO "Language_old";',
      );
    });

    it('should skip BEGIN statement', () => {
      expect(parseStatement('BEGIN;')).toBeNull();
      expect(parseStatement('BEGIN')).toBeNull();
    });

    it('should skip COMMIT statement', () => {
      expect(parseStatement('COMMIT;')).toBeNull();
      expect(parseStatement('COMMIT')).toBeNull();
    });

    it('should handle UPDATE as data migration', () => {
      const result = parseStatement(
        'UPDATE "users" SET "status" = \'ACTIVE\' WHERE "status" IS NULL',
      );
      expect(result?.type).toBe('UPDATE');
      expect(result?.rollback).toContain('DATA MIGRATION');
    });

    it('should return null for empty statements', () => {
      expect(parseStatement('')).toBeNull();
      expect(parseStatement('   ')).toBeNull();
    });

    it('should return null for comment-only statements', () => {
      expect(parseStatement('-- This is a comment')).toBeNull();
      expect(parseStatement('-- Line 1\n-- Line 2')).toBeNull();
    });

    it('should strip leading comments and parse statement', () => {
      const result = parseStatement(
        '-- AddColumn\nALTER TABLE "users" ADD COLUMN "age" INTEGER',
      );
      expect(result?.type).toBe('ALTER TABLE ADD COLUMN');
    });

    it('should return UNKNOWN for unrecognized statements', () => {
      const result = parseStatement('VACUUM ANALYZE "users"');
      expect(result?.type).toBe('UNKNOWN');
      expect(result?.rollback).toContain('⚠️  MANUAL ROLLBACK REQUIRED');
    });

    // Data Migration Operations
    describe('data migration operations', () => {
      it('should handle INSERT as data migration', () => {
        const result = parseStatement(
          'INSERT INTO "users" ("id", "name") VALUES (\'1\', \'test\')',
        );
        expect(result?.type).toBe('INSERT');
        expect(result?.rollback).toContain('DATA MIGRATION');
        expect(result?.rollback).toContain('DELETE');
      });

      it('should handle DELETE as data migration', () => {
        const result = parseStatement(
          'DELETE FROM "users" WHERE "status" = \'INACTIVE\'',
        );
        expect(result?.type).toBe('DELETE');
        expect(result?.rollback).toContain('Cannot automatically restore');
      });

      it('should handle TRUNCATE', () => {
        const result = parseStatement('TRUNCATE TABLE "sessions"');
        expect(result?.type).toBe('TRUNCATE');
        expect(result?.rollback).toContain('DESTRUCTIVE');
        expect(result?.rollback).toContain('sessions');
      });
    });

    // Table Rename Operations
    describe('table rename operations', () => {
      it('should handle ALTER TABLE RENAME TO', () => {
        const result = parseStatement(
          'ALTER TABLE "old_users" RENAME TO "users"',
        );
        expect(result?.type).toBe('ALTER TABLE RENAME');
        expect(result?.rollback).toBe(
          'ALTER TABLE "users" RENAME TO "old_users";',
        );
      });

      it('should not confuse RENAME TABLE with RENAME COLUMN', () => {
        const result = parseStatement(
          'ALTER TABLE "users" RENAME COLUMN "name" TO "displayName"',
        );
        expect(result?.type).not.toBe('ALTER TABLE RENAME');
      });
    });

    // Sequence Operations
    describe('sequence operations', () => {
      it('should handle CREATE SEQUENCE', () => {
        const result = parseStatement(
          'CREATE SEQUENCE "user_id_seq" START WITH 1 INCREMENT BY 1',
        );
        expect(result?.type).toBe('CREATE SEQUENCE');
        expect(result?.rollback).toBe('DROP SEQUENCE IF EXISTS "user_id_seq";');
      });

      it('should handle DROP SEQUENCE', () => {
        const result = parseStatement('DROP SEQUENCE "user_id_seq"');
        expect(result?.type).toBe('DROP SEQUENCE');
        expect(result?.rollback).toContain('MANUAL ROLLBACK REQUIRED');
      });

      it('should handle DROP SEQUENCE IF EXISTS', () => {
        const result = parseStatement('DROP SEQUENCE IF EXISTS "user_id_seq"');
        expect(result?.type).toBe('DROP SEQUENCE');
      });

      it('should handle ALTER SEQUENCE', () => {
        const result = parseStatement(
          'ALTER SEQUENCE "user_id_seq" RESTART WITH 100',
        );
        expect(result?.type).toBe('ALTER SEQUENCE');
        expect(result?.rollback).toContain('MANUAL ROLLBACK REQUIRED');
      });
    });

    // Extension Operations
    describe('extension operations', () => {
      it('should handle CREATE EXTENSION', () => {
        const result = parseStatement('CREATE EXTENSION "uuid-ossp"');
        expect(result?.type).toBe('CREATE EXTENSION');
        expect(result?.rollback).toBe('DROP EXTENSION IF EXISTS "uuid-ossp";');
      });

      it('should handle CREATE EXTENSION IF NOT EXISTS', () => {
        const result = parseStatement(
          'CREATE EXTENSION IF NOT EXISTS "pgcrypto"',
        );
        expect(result?.type).toBe('CREATE EXTENSION');
        expect(result?.rollback).toBe('DROP EXTENSION IF EXISTS "pgcrypto";');
      });

      it('should handle DROP EXTENSION', () => {
        const result = parseStatement('DROP EXTENSION "uuid-ossp"');
        expect(result?.type).toBe('DROP EXTENSION');
        expect(result?.rollback).toBe(
          'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
        );
      });

      it('should handle DROP EXTENSION IF EXISTS', () => {
        const result = parseStatement('DROP EXTENSION IF EXISTS "pgcrypto"');
        expect(result?.type).toBe('DROP EXTENSION');
        expect(result?.rollback).toBe(
          'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
        );
      });
    });

    // View Operations
    describe('view operations', () => {
      it('should handle CREATE VIEW', () => {
        const result = parseStatement(
          'CREATE VIEW "active_users" AS SELECT * FROM "users" WHERE "status" = \'ACTIVE\'',
        );
        expect(result?.type).toBe('CREATE VIEW');
        expect(result?.rollback).toBe('DROP VIEW IF EXISTS "active_users";');
      });

      it('should handle CREATE OR REPLACE VIEW', () => {
        const result = parseStatement(
          'CREATE OR REPLACE VIEW "active_users" AS SELECT * FROM "users"',
        );
        expect(result?.type).toBe('CREATE VIEW');
        expect(result?.rollback).toBe('DROP VIEW IF EXISTS "active_users";');
      });

      it('should handle DROP VIEW', () => {
        const result = parseStatement('DROP VIEW "active_users"');
        expect(result?.type).toBe('DROP VIEW');
        expect(result?.rollback).toContain('MANUAL ROLLBACK REQUIRED');
      });

      it('should handle CREATE MATERIALIZED VIEW', () => {
        const result = parseStatement(
          'CREATE MATERIALIZED VIEW "user_stats" AS SELECT COUNT(*) FROM "users"',
        );
        expect(result?.type).toBe('CREATE MATERIALIZED VIEW');
        expect(result?.rollback).toBe(
          'DROP MATERIALIZED VIEW IF EXISTS "user_stats";',
        );
      });

      it('should handle DROP MATERIALIZED VIEW', () => {
        const result = parseStatement('DROP MATERIALIZED VIEW "user_stats"');
        expect(result?.type).toBe('DROP MATERIALIZED VIEW');
        expect(result?.rollback).toContain('MANUAL ROLLBACK REQUIRED');
      });
    });

    // Function Operations
    describe('function operations', () => {
      it('should handle CREATE FUNCTION', () => {
        const result = parseStatement(
          'CREATE FUNCTION "get_user_count"() RETURNS INTEGER AS $$ SELECT COUNT(*) FROM users $$ LANGUAGE SQL',
        );
        expect(result?.type).toBe('CREATE FUNCTION');
        expect(result?.rollback).toBe(
          'DROP FUNCTION IF EXISTS "get_user_count";',
        );
      });

      it('should handle CREATE OR REPLACE FUNCTION', () => {
        const result = parseStatement(
          'CREATE OR REPLACE FUNCTION "my_func"() RETURNS VOID AS $$ BEGIN END $$ LANGUAGE plpgsql',
        );
        expect(result?.type).toBe('CREATE FUNCTION');
        expect(result?.rollback).toBe('DROP FUNCTION IF EXISTS "my_func";');
      });

      it('should handle DROP FUNCTION', () => {
        const result = parseStatement('DROP FUNCTION "get_user_count"');
        expect(result?.type).toBe('DROP FUNCTION');
        expect(result?.rollback).toContain('MANUAL ROLLBACK REQUIRED');
      });
    });

    // Procedure Operations
    describe('procedure operations', () => {
      it('should handle CREATE PROCEDURE', () => {
        const result = parseStatement(
          'CREATE PROCEDURE "cleanup_old_sessions"() LANGUAGE SQL AS $$ DELETE FROM sessions WHERE created_at < NOW() $$',
        );
        expect(result?.type).toBe('CREATE PROCEDURE');
        expect(result?.rollback).toBe(
          'DROP PROCEDURE IF EXISTS "cleanup_old_sessions";',
        );
      });

      it('should handle DROP PROCEDURE', () => {
        const result = parseStatement('DROP PROCEDURE "cleanup_old_sessions"');
        expect(result?.type).toBe('DROP PROCEDURE');
        expect(result?.rollback).toContain('MANUAL ROLLBACK REQUIRED');
      });
    });

    // Trigger Operations
    describe('trigger operations', () => {
      it('should handle CREATE TRIGGER', () => {
        const result = parseStatement(
          'CREATE TRIGGER "update_timestamp" BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_modified_column()',
        );
        expect(result?.type).toBe('CREATE TRIGGER');
        expect(result?.rollback).toBe(
          'DROP TRIGGER IF EXISTS "update_timestamp" ON "users";',
        );
      });

      it('should handle DROP TRIGGER', () => {
        const result = parseStatement(
          'DROP TRIGGER "update_timestamp" ON "users"',
        );
        expect(result?.type).toBe('DROP TRIGGER');
        expect(result?.rollback).toContain('MANUAL ROLLBACK REQUIRED');
        expect(result?.rollback).toContain('update_timestamp');
      });
    });

    // Row Level Security Operations
    describe('row level security operations', () => {
      it('should handle CREATE POLICY', () => {
        const result = parseStatement(
          'CREATE POLICY "user_isolation" ON "items" USING (user_id = current_user_id())',
        );
        expect(result?.type).toBe('CREATE POLICY');
        expect(result?.rollback).toBe(
          'DROP POLICY IF EXISTS "user_isolation" ON "items";',
        );
      });

      it('should handle DROP POLICY', () => {
        const result = parseStatement(
          'DROP POLICY "user_isolation" ON "items"',
        );
        expect(result?.type).toBe('DROP POLICY');
        expect(result?.rollback).toContain('MANUAL ROLLBACK REQUIRED');
      });

      it('should handle ENABLE ROW LEVEL SECURITY', () => {
        const result = parseStatement(
          'ALTER TABLE "items" ENABLE ROW LEVEL SECURITY',
        );
        expect(result?.type).toBe('ENABLE RLS');
        expect(result?.rollback).toBe(
          'ALTER TABLE "items" DISABLE ROW LEVEL SECURITY;',
        );
      });

      it('should handle DISABLE ROW LEVEL SECURITY', () => {
        const result = parseStatement(
          'ALTER TABLE "items" DISABLE ROW LEVEL SECURITY',
        );
        expect(result?.type).toBe('DISABLE RLS');
        expect(result?.rollback).toBe(
          'ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;',
        );
      });
    });

    // Permission Operations
    describe('permission operations', () => {
      it('should handle GRANT', () => {
        const result = parseStatement(
          'GRANT SELECT ON "users" TO "readonly_role"',
        );
        expect(result?.type).toBe('GRANT');
        expect(result?.rollback).toBe(
          'REVOKE SELECT ON "users" FROM "readonly_role";',
        );
      });

      it('should handle REVOKE', () => {
        const result = parseStatement(
          'REVOKE SELECT ON "users" FROM "readonly_role"',
        );
        expect(result?.type).toBe('REVOKE');
        expect(result?.rollback).toBe(
          'GRANT SELECT ON "users" TO "readonly_role";',
        );
      });

      it('should handle GRANT with multiple privileges', () => {
        const result = parseStatement(
          'GRANT SELECT, INSERT ON "users" TO "app_role"',
        );
        expect(result?.type).toBe('GRANT');
        expect(result?.rollback).toContain('REVOKE SELECT, INSERT');
      });
    });

    // Comment Operations
    describe('comment operations', () => {
      it('should handle COMMENT ON TABLE', () => {
        const result = parseStatement(
          'COMMENT ON TABLE "users" IS \'User accounts table\'',
        );
        expect(result?.type).toBe('COMMENT');
        expect(result?.rollback).toBe('COMMENT ON TABLE "users" IS NULL;');
      });

      it('should handle COMMENT ON COLUMN', () => {
        const result = parseStatement(
          'COMMENT ON COLUMN "users"."email" IS \'User email address\'',
        );
        expect(result?.type).toBe('COMMENT');
      });
    });

    // Session-level Operations
    describe('session-level operations', () => {
      it('should skip SET statements', () => {
        expect(parseStatement('SET search_path TO public')).toBeNull();
        expect(parseStatement("SET timezone = 'UTC'")).toBeNull();
      });
    });
  });

  describe('processMigrationForCatalog', () => {
    it('should extract columns from CREATE TABLE', () => {
      const catalog = createEmptyCatalog();
      const sql = `
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);`;

      processMigrationForCatalog(sql, '20251120000000_initial', catalog);

      expect(catalog.columns.get('users.id')).toEqual({
        table: 'users',
        column: 'id',
        definition: 'TEXT NOT NULL',
        addedIn: '20251120000000_initial',
      });
      expect(catalog.columns.get('users.email')).toBeDefined();
    });

    it('should extract columns from ADD COLUMN', () => {
      const catalog = createEmptyCatalog();
      const sql = 'ALTER TABLE "users" ADD COLUMN "name" TEXT NOT NULL';

      processMigrationForCatalog(sql, '20251121000000_add_name', catalog);

      expect(catalog.columns.get('users.name')).toEqual({
        table: 'users',
        column: 'name',
        definition: 'TEXT NOT NULL',
        addedIn: '20251121000000_add_name',
      });
    });

    it('should extract indexes', () => {
      const catalog = createEmptyCatalog();
      const sql = 'CREATE UNIQUE INDEX "users_email_key" ON "users"("email")';

      processMigrationForCatalog(sql, '20251120000000_initial', catalog);

      const index = catalog.indexes.get('users_email_key');
      expect(index).toBeDefined();
      expect(index?.createStatement).toContain('UNIQUE');
    });

    it('should extract foreign keys', () => {
      const catalog = createEmptyCatalog();
      const sql =
        'ALTER TABLE "items" ADD CONSTRAINT "items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE';

      processMigrationForCatalog(sql, '20251120000000_initial', catalog);

      const fk = catalog.foreignKeys.get('items_userId_fkey');
      expect(fk).toBeDefined();
      expect(fk?.table).toBe('items');
    });

    it('should extract enums', () => {
      const catalog = createEmptyCatalog();
      const sql =
        "CREATE TYPE \"ItemStatus\" AS ENUM ('ACTIVE', 'SOLD', 'ARCHIVED')";

      processMigrationForCatalog(sql, '20251120000000_initial', catalog);

      const enumDef = catalog.enums.get('ItemStatus');
      expect(enumDef).toBeDefined();
      expect(enumDef?.values).toContain('ACTIVE');
      expect(enumDef?.values).toContain('SOLD');
    });

    it('should track ALTER COLUMN TYPE changes', () => {
      const catalog = createEmptyCatalog();

      // First add the column
      catalog.columns.set('items.price', {
        table: 'items',
        column: 'price',
        definition: 'INTEGER NOT NULL',
        addedIn: '20251120000000_initial',
      });

      // Now alter its type
      const sql = 'ALTER TABLE "items" ALTER COLUMN "price" TYPE DECIMAL(10,2)';
      processMigrationForCatalog(sql, '20251121000000_change_price', catalog);

      const col = catalog.columns.get('items.price');
      expect(col?.definition).toBe('DECIMAL(10,2)');
      expect(col?.addedIn).toContain('modified in 20251121000000_change_price');
    });

    it('should track SET NOT NULL', () => {
      const catalog = createEmptyCatalog();

      catalog.columns.set('users.bio', {
        table: 'users',
        column: 'bio',
        definition: 'TEXT',
        addedIn: '20251120000000_initial',
      });

      const sql = 'ALTER TABLE "users" ALTER COLUMN "bio" SET NOT NULL';
      processMigrationForCatalog(sql, '20251121000000_require_bio', catalog);

      const col = catalog.columns.get('users.bio');
      expect(col?.definition).toContain('NOT NULL');
    });

    it('should track DROP NOT NULL', () => {
      const catalog = createEmptyCatalog();

      catalog.columns.set('users.bio', {
        table: 'users',
        column: 'bio',
        definition: 'TEXT NOT NULL',
        addedIn: '20251120000000_initial',
      });

      const sql = 'ALTER TABLE "users" ALTER COLUMN "bio" DROP NOT NULL';
      processMigrationForCatalog(sql, '20251121000000_optional_bio', catalog);

      const col = catalog.columns.get('users.bio');
      expect(col?.definition).not.toContain('NOT NULL');
    });

    it('should track SET DEFAULT', () => {
      const catalog = createEmptyCatalog();

      catalog.columns.set('users.role', {
        table: 'users',
        column: 'role',
        definition: 'TEXT NOT NULL',
        addedIn: '20251120000000_initial',
      });

      const sql =
        'ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT \'USER\'';
      processMigrationForCatalog(sql, '20251121000000_default_role', catalog);

      const col = catalog.columns.get('users.role');
      expect(col?.definition).toContain("DEFAULT 'USER'");
    });

    it('should track DROP DEFAULT', () => {
      const catalog = createEmptyCatalog();

      catalog.columns.set('users.role', {
        table: 'users',
        column: 'role',
        definition: "TEXT NOT NULL DEFAULT 'USER'",
        addedIn: '20251120000000_initial',
      });

      const sql = 'ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT';
      processMigrationForCatalog(sql, '20251121000000_no_default', catalog);

      const col = catalog.columns.get('users.role');
      expect(col?.definition).not.toContain('DEFAULT');
    });

    it('should track RENAME COLUMN', () => {
      const catalog = createEmptyCatalog();

      catalog.columns.set('users.name', {
        table: 'users',
        column: 'name',
        definition: 'TEXT NOT NULL',
        addedIn: '20251120000000_initial',
      });

      const sql = 'ALTER TABLE "users" RENAME COLUMN "name" TO "displayName"';
      processMigrationForCatalog(sql, '20251121000000_rename', catalog);

      expect(catalog.columns.has('users.name')).toBe(false);
      expect(catalog.columns.has('users.displayName')).toBe(true);
      const col = catalog.columns.get('users.displayName');
      expect(col?.column).toBe('displayName');
      expect(col?.addedIn).toContain('renamed in 20251121000000_rename');
    });

    it('should track enum value additions', () => {
      const catalog = createEmptyCatalog();

      catalog.enums.set('ItemStatus', {
        name: 'ItemStatus',
        values: ['ACTIVE', 'SOLD'],
        addedIn: '20251120000000_initial',
      });

      const sql = 'ALTER TYPE "ItemStatus" ADD VALUE \'ARCHIVED\'';
      processMigrationForCatalog(sql, '20251121000000_add_archived', catalog);

      const enumDef = catalog.enums.get('ItemStatus');
      expect(enumDef?.values).toContain('ARCHIVED');
    });

    it('should remove dropped columns from catalog', () => {
      const catalog = createEmptyCatalog();

      catalog.columns.set('users.legacy', {
        table: 'users',
        column: 'legacy',
        definition: 'TEXT',
        addedIn: '20251120000000_initial',
      });

      const sql = 'ALTER TABLE "users" DROP COLUMN "legacy"';
      processMigrationForCatalog(sql, '20251121000000_cleanup', catalog);

      expect(catalog.columns.has('users.legacy')).toBe(false);
    });

    it('should remove dropped indexes from catalog', () => {
      const catalog = createEmptyCatalog();

      catalog.indexes.set('users_legacy_idx', {
        name: 'users_legacy_idx',
        createStatement:
          'CREATE INDEX "users_legacy_idx" ON "users"("legacy");',
        addedIn: '20251120000000_initial',
      });

      const sql = 'DROP INDEX "users_legacy_idx"';
      processMigrationForCatalog(sql, '20251121000000_cleanup', catalog);

      expect(catalog.indexes.has('users_legacy_idx')).toBe(false);
    });
  });

  describe('generateRollbackSql', () => {
    it('should generate rollback header with migration name', () => {
      const sql = 'CREATE TABLE "test" (id TEXT)';
      const result = generateRollbackSql(sql, '20251120000000_test');

      expect(result).toContain(
        'Rollback SQL for migration: 20251120000000_test',
      );
      expect(result).toContain('Generated:');
    });

    it('should include execution command in header', () => {
      const sql = 'CREATE TABLE "test" (id TEXT)';
      const result = generateRollbackSql(sql, '20251120000000_test');

      expect(result).toContain('yarn migrate:rollback 20251120000000_test');
    });

    it('should reverse operations in correct order', () => {
      const sql = `
CREATE TABLE "users" (id TEXT);
CREATE INDEX "users_id_idx" ON "users"("id");
`;
      const result = generateRollbackSql(sql, '20251120000000_test');

      // DROP INDEX should come before DROP TABLE
      const dropIndexPos = result.indexOf('DROP INDEX');
      const dropTablePos = result.indexOf('DROP TABLE');
      expect(dropIndexPos).toBeLessThan(dropTablePos);
    });

    it('should strip block comments from SQL', () => {
      const sql = `
/* Warnings:
  - This is a warning
*/
CREATE TABLE "test" (id TEXT);
`;
      const result = generateRollbackSql(sql, '20251120000000_test');

      expect(result).toContain('DROP TABLE IF EXISTS "test"');
      expect(result).not.toContain('Warnings');
    });

    it('should handle empty migrations', () => {
      const sql = '';
      const result = generateRollbackSql(sql, '20251120000000_empty');

      expect(result).toContain('Rollback SQL for migration');
      // Empty migrations just have the header, no rollback statements
      expect(result).not.toContain('DROP');
      expect(result).not.toContain('ALTER');
    });

    it('should handle comment-only migrations', () => {
      const sql = '-- Just a comment\n-- Another comment';
      const result = generateRollbackSql(sql, '20251120000000_comments');

      // Comment-only migrations just have the header, no rollback statements
      expect(result).toContain('Rollback SQL for migration');
      expect(result).not.toContain('DROP');
    });
  });
});
