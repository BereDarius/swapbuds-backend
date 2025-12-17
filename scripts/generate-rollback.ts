#!/usr/bin/env npx ts-node

/**
 * Prisma Rollback SQL Generator
 *
 * Analyzes a migration.sql file and generates a corresponding rollback.sql
 * by reversing the operations (CREATE -> DROP, ADD -> DROP, etc.)
 *
 * This enhanced version builds a schema catalog from all migrations to
 * properly restore dropped columns/tables/indexes.
 *
 * Usage:
 *   npx ts-node scripts/generate-rollback.ts <migration_name>
 *   npx ts-node scripts/generate-rollback.ts --all
 *   npx ts-node scripts/generate-rollback.ts --missing
 *
 * Examples:
 *   npx ts-node scripts/generate-rollback.ts 20251130070905_add_email_verification
 *   npx ts-node scripts/generate-rollback.ts --missing
 */

import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

interface ParsedStatement {
  type: string;
  statement: string;
  rollback: string;
}

// Schema catalog to track definitions for proper rollback of destructive operations
interface ColumnDefinition {
  table: string;
  column: string;
  definition: string; // Full column definition from CREATE TABLE
  addedIn: string; // Migration name where column was added
}

interface IndexDefinition {
  name: string;
  createStatement: string;
  addedIn: string;
}

interface ForeignKeyDefinition {
  name: string;
  table: string;
  createStatement: string;
  addedIn: string;
}

interface EnumDefinition {
  name: string;
  values: string[];
  addedIn: string;
}

interface SchemaCatalog {
  columns: Map<string, ColumnDefinition>; // key: table.column
  indexes: Map<string, IndexDefinition>;
  foreignKeys: Map<string, ForeignKeyDefinition>;
  enums: Map<string, EnumDefinition>;
}

function buildSchemaCatalog(upToMigration?: string): SchemaCatalog {
  const catalog: SchemaCatalog = {
    columns: new Map(),
    indexes: new Map(),
    foreignKeys: new Map(),
    enums: new Map(),
  };

  const migrations = getMigrationDirs();

  for (const migration of migrations) {
    // Stop if we've reached the target migration
    if (upToMigration && migration >= upToMigration) {
      break;
    }

    const migrationFile = path.join(MIGRATIONS_DIR, migration, 'migration.sql');
    if (!fs.existsSync(migrationFile)) continue;

    const sql = fs.readFileSync(migrationFile, 'utf-8');
    processMigrationForCatalog(sql, migration, catalog);
  }

  return catalog;
}

function processMigrationForCatalog(
  sql: string,
  migrationName: string,
  catalog: SchemaCatalog,
): void {
  // Extract CREATE TABLE statements and their columns
  const createTableRegex =
    /CREATE TABLE\s+"?(\w+)"?\s*\(([\s\S]*?)\n\s*CONSTRAINT/gi;
  let match;

  while ((match = createTableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnsBlock = match[2];

    // Parse individual columns
    const columnLines = columnsBlock.split('\n').filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed &&
        !trimmed.startsWith('CONSTRAINT') &&
        !trimmed.startsWith('--') &&
        trimmed.includes('"')
      );
    });

    for (const line of columnLines) {
      const colMatch = line.match(/"(\w+)"\s+(.+?)(?:,\s*$|$)/);
      if (colMatch) {
        const columnName = colMatch[1];
        const definition = colMatch[2].replace(/,\s*$/, '').trim();
        catalog.columns.set(`${tableName}.${columnName}`, {
          table: tableName,
          column: columnName,
          definition,
          addedIn: migrationName,
        });
      }
    }
  }

  // Extract ALTER TABLE ADD COLUMN - handle Prisma's multi-line format
  // Matches: ALTER TABLE "table" ADD COLUMN     "column" TYPE...
  const addColumnRegex =
    /ALTER TABLE\s+"?(\w+)"?\s+ADD\s+COLUMN\s+\"(\w+)\"\s+([^,;]+)/gi;
  while ((match = addColumnRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnName = match[2];
    const definition = match[3].trim();
    catalog.columns.set(`${tableName}.${columnName}`, {
      table: tableName,
      column: columnName,
      definition,
      addedIn: migrationName,
    });
  }

  // Also handle inline ADD COLUMN in compound statements
  // Matches: ADD COLUMN     "column" TYPE... (within a larger ALTER TABLE)
  const inlineAddColumnRegex =
    /ALTER TABLE\s+"?(\w+)"?[\s\S]*?ADD\s+COLUMN\s+\"(\w+)\"\s+([^,;\n]+)/gi;
  while ((match = inlineAddColumnRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnName = match[2];
    const definition = match[3].trim().replace(/,?\s*$/, '');
    const key = `${tableName}.${columnName}`;
    if (!catalog.columns.has(key)) {
      catalog.columns.set(key, {
        table: tableName,
        column: columnName,
        definition,
        addedIn: migrationName,
      });
    }
  }

  // Extract CREATE INDEX
  const createIndexRegex =
    /CREATE\s+(UNIQUE\s+)?INDEX\s+"?(\w+)"?\s+ON\s+"?(\w+)"?\s*\(([^)]+)\)/gi;
  while ((match = createIndexRegex.exec(sql)) !== null) {
    const isUnique = match[1] ? 'UNIQUE ' : '';
    const indexName = match[2];
    const tableName = match[3];
    const columns = match[4];
    catalog.indexes.set(indexName, {
      name: indexName,
      createStatement: `CREATE ${isUnique}INDEX "${indexName}" ON "${tableName}"(${columns});`,
      addedIn: migrationName,
    });
  }

  // Extract ADD CONSTRAINT ... FOREIGN KEY
  const fkRegex =
    /ALTER TABLE\s+"?(\w+)"?\s+ADD CONSTRAINT\s+"?(\w+)"?\s+FOREIGN KEY\s*\(([^)]+)\)\s+REFERENCES\s+"?(\w+)"?\s*\(([^)]+)\)([^;]*)/gi;
  while ((match = fkRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const constraintName = match[2];
    const columns = match[3];
    const refTable = match[4];
    const refColumns = match[5];
    const options = match[6] || '';
    catalog.foreignKeys.set(constraintName, {
      name: constraintName,
      table: tableName,
      createStatement: `ALTER TABLE "${tableName}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY (${columns}) REFERENCES "${refTable}"(${refColumns})${options};`,
      addedIn: migrationName,
    });
  }

  // Extract CREATE TYPE ... AS ENUM
  const enumRegex = /CREATE TYPE\s+"?(\w+)"?\s+AS ENUM\s*\(([^)]+)\)/gi;
  while ((match = enumRegex.exec(sql)) !== null) {
    const enumName = match[1];
    const valuesStr = match[2];
    const values =
      valuesStr.match(/'([^']+)'/g)?.map((v) => v.replace(/'/g, '')) || [];
    catalog.enums.set(enumName, {
      name: enumName,
      values,
      addedIn: migrationName,
    });
  }

  // Track ALTER COLUMN TYPE changes - update the column definition to latest version
  // Matches: ALTER TABLE "table" ALTER COLUMN "column" TYPE newType
  // Note: [^;\n]+ is used to handle types with commas like DECIMAL(10,2)
  const alterColumnTypeRegex =
    /ALTER TABLE\s+"?(\w+)"?\s+ALTER COLUMN\s+"?(\w+)"?\s+(?:SET DATA\s+)?TYPE\s+([^;\n]+?)(?:\s+USING|\s*;|\s*$)/gi;
  while ((match = alterColumnTypeRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnName = match[2];
    const newType = match[3].trim();
    const key = `${tableName}.${columnName}`;

    if (catalog.columns.has(key)) {
      const existing = catalog.columns.get(key)!;
      // Update to the new type, keeping track of where it was last modified
      catalog.columns.set(key, {
        ...existing,
        definition: newType,
        addedIn: `${existing.addedIn} (modified in ${migrationName})`,
      });
    }
  }

  // Track ALTER COLUMN SET NOT NULL
  const setNotNullRegex =
    /ALTER TABLE\s+"?(\w+)"?\s+ALTER COLUMN\s+"?(\w+)"?\s+SET NOT NULL/gi;
  while ((match = setNotNullRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnName = match[2];
    const key = `${tableName}.${columnName}`;

    if (catalog.columns.has(key)) {
      const existing = catalog.columns.get(key)!;
      // Add NOT NULL if not already present
      if (!existing.definition.includes('NOT NULL')) {
        catalog.columns.set(key, {
          ...existing,
          definition: `${existing.definition} NOT NULL`,
          addedIn: `${existing.addedIn} (modified in ${migrationName})`,
        });
      }
    }
  }

  // Track ALTER COLUMN DROP NOT NULL
  const dropNotNullRegex =
    /ALTER TABLE\s+"?(\w+)"?\s+ALTER COLUMN\s+"?(\w+)"?\s+DROP NOT NULL/gi;
  while ((match = dropNotNullRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnName = match[2];
    const key = `${tableName}.${columnName}`;

    if (catalog.columns.has(key)) {
      const existing = catalog.columns.get(key)!;
      // Remove NOT NULL from definition
      catalog.columns.set(key, {
        ...existing,
        definition: existing.definition.replace(/\s*NOT NULL\s*/gi, ' ').trim(),
        addedIn: `${existing.addedIn} (modified in ${migrationName})`,
      });
    }
  }

  // Track ALTER COLUMN SET DEFAULT
  const setDefaultRegex =
    /ALTER TABLE\s+"?(\w+)"?\s+ALTER COLUMN\s+"?(\w+)"?\s+SET DEFAULT\s+([^,;\n]+)/gi;
  while ((match = setDefaultRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnName = match[2];
    const defaultValue = match[3].trim();
    const key = `${tableName}.${columnName}`;

    if (catalog.columns.has(key)) {
      const existing = catalog.columns.get(key)!;
      // Update or add DEFAULT clause
      let newDef = existing.definition.replace(/\s*DEFAULT\s+[^,\s]+/gi, '');
      newDef = `${newDef} DEFAULT ${defaultValue}`;
      catalog.columns.set(key, {
        ...existing,
        definition: newDef.trim(),
        addedIn: `${existing.addedIn} (modified in ${migrationName})`,
      });
    }
  }

  // Track ALTER COLUMN DROP DEFAULT
  const dropDefaultRegex =
    /ALTER TABLE\s+"?(\w+)"?\s+ALTER COLUMN\s+"?(\w+)"?\s+DROP DEFAULT/gi;
  while ((match = dropDefaultRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnName = match[2];
    const key = `${tableName}.${columnName}`;

    if (catalog.columns.has(key)) {
      const existing = catalog.columns.get(key)!;
      // Remove DEFAULT clause from definition
      catalog.columns.set(key, {
        ...existing,
        definition: existing.definition
          .replace(/\s*DEFAULT\s+[^,\s]+/gi, '')
          .trim(),
        addedIn: `${existing.addedIn} (modified in ${migrationName})`,
      });
    }
  }

  // Track RENAME COLUMN
  const renameColumnRegex =
    /ALTER TABLE\s+"?(\w+)"?\s+RENAME COLUMN\s+"?(\w+)"?\s+TO\s+"?(\w+)"?/gi;
  while ((match = renameColumnRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const oldColumnName = match[2];
    const newColumnName = match[3];
    const oldKey = `${tableName}.${oldColumnName}`;
    const newKey = `${tableName}.${newColumnName}`;

    if (catalog.columns.has(oldKey)) {
      const existing = catalog.columns.get(oldKey)!;
      // Move to new key with updated column name
      catalog.columns.delete(oldKey);
      catalog.columns.set(newKey, {
        ...existing,
        column: newColumnName,
        addedIn: `${existing.addedIn} (renamed in ${migrationName})`,
      });
    }
  }

  // Track enum value additions (ALTER TYPE ADD VALUE)
  const addEnumValueRegex = /ALTER TYPE\s+"?(\w+)"?\s+ADD VALUE\s+'([^']+)'/gi;
  while ((match = addEnumValueRegex.exec(sql)) !== null) {
    const enumName = match[1];
    const newValue = match[2];

    if (catalog.enums.has(enumName)) {
      const existing = catalog.enums.get(enumName)!;
      if (!existing.values.includes(newValue)) {
        catalog.enums.set(enumName, {
          ...existing,
          values: [...existing.values, newValue],
          addedIn: `${existing.addedIn} (modified in ${migrationName})`,
        });
      }
    }
  }

  // Handle DROP operations by removing from catalog
  const dropColumnRegex = /ALTER TABLE\s+"?(\w+)"?\s+DROP COLUMN\s+"?(\w+)"?/gi;
  while ((match = dropColumnRegex.exec(sql)) !== null) {
    catalog.columns.delete(`${match[1]}.${match[2]}`);
  }

  const dropIndexRegex = /DROP INDEX\s+(IF EXISTS\s+)?"?(\w+)"?/gi;
  while ((match = dropIndexRegex.exec(sql)) !== null) {
    catalog.indexes.delete(match[2]);
  }
}

function getMigrationDirs(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((dir) => {
      const fullPath = path.join(MIGRATIONS_DIR, dir);
      return (
        fs.statSync(fullPath).isDirectory() && !dir.startsWith('migration_lock')
      );
    })
    .sort();
}

function parseCreateTable(statement: string): string | null {
  const match = statement.match(/CREATE TABLE\s+"?(\w+)"?/i);
  if (match) {
    return `DROP TABLE IF EXISTS "${match[1]}" CASCADE;`;
  }
  return null;
}

function parseCreateEnum(statement: string): string | null {
  const match = statement.match(/CREATE TYPE\s+"?(\w+)"?\s+AS ENUM/i);
  if (match) {
    return `DROP TYPE IF EXISTS "${match[1]}";`;
  }
  return null;
}

function parseCreateIndex(statement: string): string | null {
  const match = statement.match(/CREATE\s+(UNIQUE\s+)?INDEX\s+"?(\w+)"?/i);
  if (match) {
    return `DROP INDEX IF EXISTS "${match[2]}";`;
  }
  return null;
}

function parseAlterTableAddColumn(statement: string): string | null {
  // Match: ALTER TABLE "table" ADD COLUMN "column" ...
  const tableMatch = statement.match(/ALTER TABLE\s+"?(\w+)"?/i);
  const columnMatches = [
    ...statement.matchAll(/ADD COLUMN\s+"?(\w+)"?/gi),
    ...statement.matchAll(/ADD\s+"?(\w+)"?\s+\w+/gi),
  ];

  if (tableMatch && columnMatches.length > 0) {
    const tableName = tableMatch[1];
    const drops = columnMatches
      .map((m) => `ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${m[1]}";`)
      .join('\n');
    return drops;
  }
  return null;
}

function parseAlterTableDropColumn(
  statement: string,
  catalog?: SchemaCatalog,
): string | null {
  const tableMatch = statement.match(/ALTER TABLE\s+"?(\w+)"?/i);
  const columnMatch = statement.match(/DROP COLUMN\s+"?(\w+)"?/i);

  if (tableMatch && columnMatch) {
    const tableName = tableMatch[1];
    const columnName = columnMatch[1];

    // Try to find the original column definition in the catalog
    if (catalog) {
      const colDef = catalog.columns.get(`${tableName}.${columnName}`);
      if (colDef) {
        return `-- Restore dropped column (originally defined in ${colDef.addedIn})\nALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${colDef.definition};`;
      }
    }

    // Fallback if no catalog or column not found
    return `-- ⚠️  Column definition not found in schema catalog\n-- ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" <TYPE>;`;
  }
  return null;
}

function parseDropIndex(
  statement: string,
  catalog?: SchemaCatalog,
): string | null {
  const match = statement.match(/DROP INDEX\s+(IF EXISTS\s+)?"?(\w+)"?/i);
  if (match) {
    const indexName = match[2];

    // Try to find the original index definition in the catalog
    if (catalog) {
      const indexDef = catalog.indexes.get(indexName);
      if (indexDef) {
        return `-- Restore dropped index (originally defined in ${indexDef.addedIn})\n${indexDef.createStatement}`;
      }
    }

    return `-- ⚠️  Index definition not found in schema catalog\n-- CREATE INDEX "${indexName}" ON "table"("column");`;
  }
  return null;
}

function parseDropForeignKey(
  statement: string,
  catalog?: SchemaCatalog,
): string | null {
  const tableMatch = statement.match(/ALTER TABLE\s+"?(\w+)"?/i);
  const constraintMatch = statement.match(/DROP CONSTRAINT\s+"?(\w+)"?/i);

  if (tableMatch && constraintMatch) {
    const constraintName = constraintMatch[1];

    // Try to find the original FK definition in the catalog
    if (catalog) {
      const fkDef = catalog.foreignKeys.get(constraintName);
      if (fkDef) {
        return `-- Restore dropped foreign key (originally defined in ${fkDef.addedIn})\n${fkDef.createStatement}`;
      }
    }

    return `-- ⚠️  Foreign key definition not found in schema catalog\n-- ALTER TABLE "${tableMatch[1]}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY (...) REFERENCES ...;`;
  }
  return null;
}

function parseAlterTableAddConstraint(statement: string): string | null {
  const tableMatch = statement.match(/ALTER TABLE\s+"?(\w+)"?/i);
  const constraintMatch = statement.match(/ADD CONSTRAINT\s+"?(\w+)"?/i);

  if (tableMatch && constraintMatch) {
    return `ALTER TABLE "${tableMatch[1]}" DROP CONSTRAINT IF EXISTS "${constraintMatch[1]}";`;
  }
  return null;
}

function parseAlterTableAddForeignKey(statement: string): string | null {
  const tableMatch = statement.match(/ALTER TABLE\s+"?(\w+)"?/i);
  const constraintMatch = statement.match(/ADD CONSTRAINT\s+"?(\w+)"?/i);

  if (tableMatch && constraintMatch) {
    return `ALTER TABLE "${tableMatch[1]}" DROP CONSTRAINT IF EXISTS "${constraintMatch[1]}";`;
  }
  return null;
}

function parseDropTable(statement: string): string | null {
  // Destructive - can't auto-rollback
  const match = statement.match(/DROP TABLE\s+(IF EXISTS\s+)?"?(\w+)"?/i);
  if (match) {
    return `-- ⚠️  MANUAL ROLLBACK REQUIRED: Cannot automatically recreate dropped table "${match[2]}"`;
  }
  return null;
}

function parseDropEnum(statement: string): string | null {
  const match = statement.match(/DROP TYPE\s+(IF EXISTS\s+)?"?(\w+)"?/i);
  if (match) {
    return `-- ⚠️  MANUAL ROLLBACK REQUIRED: Cannot automatically recreate dropped enum "${match[1]}"`;
  }
  return null;
}

function parseAlterEnumAddValue(statement: string): string | null {
  // PostgreSQL doesn't support removing enum values easily
  const typeMatch = statement.match(/ALTER TYPE\s+"?(\w+)"?/i);
  const valueMatch = statement.match(/ADD VALUE\s+'([^']+)'/i);

  if (typeMatch && valueMatch) {
    return `-- ⚠️  MANUAL ROLLBACK REQUIRED: PostgreSQL doesn't easily support removing enum values\n-- You may need to recreate the enum type "${typeMatch[1]}" without value '${valueMatch[1]}'`;
  }
  return null;
}

function parseCompoundAlterTable(
  statement: string,
  catalog?: SchemaCatalog,
): string | null {
  // Handle compound ALTER TABLE statements with multiple operations
  // e.g., ALTER TABLE "trades" ALTER COLUMN "itemOfferedId" DROP NOT NULL, ALTER COLUMN "itemRequestedId" DROP NOT NULL;
  const tableMatch = statement.match(/ALTER TABLE\s+"?(\w+)"?/i);
  if (!tableMatch) return null;

  const tableName = tableMatch[1];
  const rollbackParts: string[] = [];

  // Find all ALTER COLUMN ... DROP NOT NULL
  const dropNotNullMatches = [
    ...statement.matchAll(/ALTER COLUMN\s+"?(\w+)"?\s+DROP NOT NULL/gi),
  ];
  for (const match of dropNotNullMatches) {
    rollbackParts.push(
      `ALTER TABLE "${tableName}" ALTER COLUMN "${match[1]}" SET NOT NULL;`,
    );
  }

  // Find all ALTER COLUMN ... SET NOT NULL
  const setNotNullMatches = [
    ...statement.matchAll(/ALTER COLUMN\s+"?(\w+)"?\s+SET NOT NULL/gi),
  ];
  for (const match of setNotNullMatches) {
    rollbackParts.push(
      `ALTER TABLE "${tableName}" ALTER COLUMN "${match[1]}" DROP NOT NULL;`,
    );
  }

  // Find all ALTER COLUMN ... DROP DEFAULT
  const dropDefaultMatches = [
    ...statement.matchAll(/ALTER COLUMN\s+"?(\w+)"?\s+DROP DEFAULT/gi),
  ];
  for (const match of dropDefaultMatches) {
    const columnName = match[1];
    if (catalog) {
      const colDef = catalog.columns.get(`${tableName}.${columnName}`);
      if (colDef) {
        const prevDefaultMatch =
          colDef.definition.match(/DEFAULT\s+([^,\s]+)/i);
        if (prevDefaultMatch) {
          rollbackParts.push(
            `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET DEFAULT ${prevDefaultMatch[1]};`,
          );
          continue;
        }
      }
    }
    rollbackParts.push(
      `-- ⚠️  Previous default for "${columnName}" not found\n-- ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET DEFAULT <VALUE>;`,
    );
  }

  // Find all ALTER COLUMN ... SET DEFAULT
  const setDefaultMatches = [
    ...statement.matchAll(
      /ALTER COLUMN\s+"?(\w+)"?\s+SET DEFAULT\s+([^,;\n]+)/gi,
    ),
  ];
  for (const match of setDefaultMatches) {
    const columnName = match[1];
    if (catalog) {
      const colDef = catalog.columns.get(`${tableName}.${columnName}`);
      if (colDef) {
        const prevDefaultMatch =
          colDef.definition.match(/DEFAULT\s+([^,\s]+)/i);
        if (prevDefaultMatch) {
          rollbackParts.push(
            `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" SET DEFAULT ${prevDefaultMatch[1]};`,
          );
          continue;
        }
      }
    }
    rollbackParts.push(
      `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" DROP DEFAULT;`,
    );
  }

  // Find all ALTER COLUMN ... TYPE (with optional USING)
  const typeMatches = [
    ...statement.matchAll(
      /ALTER COLUMN\s+"?(\w+)"?\s+(?:SET DATA\s+)?TYPE\s+([^,;\n]+?)(?:,|$|\s+USING)/gi,
    ),
  ];
  for (const match of typeMatches) {
    const columnName = match[1];
    if (catalog) {
      const colDef = catalog.columns.get(`${tableName}.${columnName}`);
      if (colDef) {
        rollbackParts.push(
          `-- Restore previous column type\nALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE ${colDef.definition};`,
        );
        continue;
      }
    }
    rollbackParts.push(
      `-- ⚠️  Previous type for "${columnName}" not found\n-- ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" TYPE <PREVIOUS_TYPE>;`,
    );
  }

  if (rollbackParts.length > 0) {
    return rollbackParts.join('\n\n');
  }
  return null;
}

function parseStatement(
  statement: string,
  catalog?: SchemaCatalog,
): ParsedStatement | null {
  const trimmed = statement.trim();

  if (!trimmed) {
    return null;
  }

  // Strip leading SQL comments (-- comment lines) to get to the actual SQL
  const withoutComments = trimmed
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();

  // If it's only comments, skip it
  if (!withoutComments) {
    return null;
  }

  let rollback: string | null = null;

  if (/CREATE TABLE/i.test(withoutComments)) {
    rollback = parseCreateTable(withoutComments);
    return rollback
      ? { type: 'CREATE TABLE', statement: withoutComments, rollback }
      : null;
  }

  if (/CREATE TYPE.*AS ENUM/i.test(withoutComments)) {
    rollback = parseCreateEnum(withoutComments);
    return rollback
      ? { type: 'CREATE ENUM', statement: withoutComments, rollback }
      : null;
  }

  if (/CREATE\s+(UNIQUE\s+)?INDEX/i.test(withoutComments)) {
    rollback = parseCreateIndex(withoutComments);
    return rollback
      ? { type: 'CREATE INDEX', statement: withoutComments, rollback }
      : null;
  }

  if (/ALTER TABLE.*ADD COLUMN/i.test(withoutComments)) {
    rollback = parseAlterTableAddColumn(withoutComments);
    return rollback
      ? { type: 'ALTER TABLE ADD COLUMN', statement: withoutComments, rollback }
      : null;
  }

  if (/ALTER TABLE.*DROP COLUMN/i.test(withoutComments)) {
    rollback = parseAlterTableDropColumn(withoutComments, catalog);
    return rollback
      ? {
          type: 'ALTER TABLE DROP COLUMN',
          statement: withoutComments,
          rollback,
        }
      : null;
  }

  // Handle DROP INDEX statements
  if (/DROP INDEX/i.test(withoutComments)) {
    rollback = parseDropIndex(withoutComments, catalog);
    return rollback
      ? { type: 'DROP INDEX', statement: withoutComments, rollback }
      : null;
  }

  // Handle DROP CONSTRAINT / DROP FOREIGN KEY
  if (/ALTER TABLE.*DROP CONSTRAINT/i.test(withoutComments)) {
    rollback = parseDropForeignKey(withoutComments, catalog);
    return rollback
      ? { type: 'DROP CONSTRAINT', statement: withoutComments, rollback }
      : null;
  }

  if (/ALTER TABLE.*ADD CONSTRAINT/i.test(withoutComments)) {
    rollback = parseAlterTableAddConstraint(withoutComments);
    return rollback
      ? {
          type: 'ALTER TABLE ADD CONSTRAINT',
          statement: withoutComments,
          rollback,
        }
      : null;
  }

  // Handle ALTER TABLE ... ADD FOREIGN KEY (AddForeignKey comments)
  if (/ALTER TABLE.*ADD.*FOREIGN KEY/i.test(withoutComments)) {
    rollback = parseAlterTableAddForeignKey(withoutComments);
    return rollback
      ? {
          type: 'ALTER TABLE ADD FOREIGN KEY',
          statement: withoutComments,
          rollback,
        }
      : null;
  }

  if (/DROP TABLE/i.test(withoutComments)) {
    rollback = parseDropTable(withoutComments);
    return rollback
      ? { type: 'DROP TABLE', statement: withoutComments, rollback }
      : null;
  }

  if (/DROP TYPE/i.test(withoutComments)) {
    rollback = parseDropEnum(withoutComments);
    return rollback
      ? { type: 'DROP TYPE', statement: withoutComments, rollback }
      : null;
  }

  if (/ALTER TYPE.*ADD VALUE/i.test(withoutComments)) {
    rollback = parseAlterEnumAddValue(withoutComments);
    return rollback
      ? { type: 'ALTER TYPE ADD VALUE', statement: withoutComments, rollback }
      : null;
  }

  // Handle ALTER TYPE ... RENAME TO (enum renaming)
  if (/ALTER TYPE.*RENAME TO/i.test(withoutComments)) {
    const match = withoutComments.match(
      /ALTER TYPE\s+"?(\w+)"?\s+RENAME TO\s+"?(\w+)"?/i,
    );
    if (match) {
      rollback = `ALTER TYPE "${match[2]}" RENAME TO "${match[1]}";`;
      return {
        type: 'ALTER TYPE RENAME',
        statement: withoutComments,
        rollback,
      };
    }
  }

  // Skip transaction control statements - they don't need rollback
  if (/^(BEGIN|COMMIT|ROLLBACK)\s*;?$/i.test(withoutComments.trim())) {
    return null;
  }

  // Handle UPDATE statements used for data migrations - require manual handling
  if (/^UPDATE\s+/i.test(withoutComments)) {
    return {
      type: 'UPDATE',
      statement: withoutComments,
      rollback: `-- ⚠️  DATA MIGRATION: Manual rollback may be needed\n-- Original: ${withoutComments.substring(0, 80).replace(/\n/g, ' ')}...`,
    };
  }

  // Handle INSERT statements - data migrations
  if (/^INSERT\s+INTO/i.test(withoutComments)) {
    const tableMatch = withoutComments.match(/INSERT\s+INTO\s+"?(\w+)"?/i);
    const tableName = tableMatch?.[1] || 'table';
    return {
      type: 'INSERT',
      statement: withoutComments,
      rollback: `-- ⚠️  DATA MIGRATION: Manual rollback required\n-- You may need to DELETE the inserted rows from "${tableName}"`,
    };
  }

  // Handle DELETE statements - data migrations
  if (/^DELETE\s+FROM/i.test(withoutComments)) {
    return {
      type: 'DELETE',
      statement: withoutComments,
      rollback: `-- ⚠️  DATA MIGRATION: Cannot automatically restore deleted data\n-- Original: ${withoutComments.substring(0, 80).replace(/\n/g, ' ')}...`,
    };
  }

  // Handle TRUNCATE statements
  if (/^TRUNCATE\s+/i.test(withoutComments)) {
    const tableMatch = withoutComments.match(
      /TRUNCATE\s+(?:TABLE\s+)?"?(\w+)"?/i,
    );
    const tableName = tableMatch?.[1] || 'table';
    return {
      type: 'TRUNCATE',
      statement: withoutComments,
      rollback: `-- ⚠️  DESTRUCTIVE: Cannot restore truncated data from "${tableName}"`,
    };
  }

  // Handle RENAME TABLE (ALTER TABLE ... RENAME TO)
  if (
    /ALTER TABLE.*RENAME TO/i.test(withoutComments) &&
    !/RENAME COLUMN/i.test(withoutComments)
  ) {
    const match = withoutComments.match(
      /ALTER TABLE\s+"?(\w+)"?\s+RENAME TO\s+"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'ALTER TABLE RENAME',
        statement: withoutComments,
        rollback: `ALTER TABLE "${match[2]}" RENAME TO "${match[1]}";`,
      };
    }
  }

  // Handle CREATE SEQUENCE
  if (/^CREATE\s+SEQUENCE/i.test(withoutComments)) {
    const match = withoutComments.match(/CREATE\s+SEQUENCE\s+"?(\w+)"?/i);
    if (match) {
      return {
        type: 'CREATE SEQUENCE',
        statement: withoutComments,
        rollback: `DROP SEQUENCE IF EXISTS "${match[1]}";`,
      };
    }
  }

  // Handle DROP SEQUENCE
  if (/^DROP\s+SEQUENCE/i.test(withoutComments)) {
    const match = withoutComments.match(
      /DROP\s+SEQUENCE\s+(?:IF EXISTS\s+)?"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'DROP SEQUENCE',
        statement: withoutComments,
        rollback: `-- ⚠️  MANUAL ROLLBACK REQUIRED: Recreate sequence "${match[1]}" with original settings`,
      };
    }
  }

  // Handle ALTER SEQUENCE
  if (/^ALTER\s+SEQUENCE/i.test(withoutComments)) {
    const match = withoutComments.match(/ALTER\s+SEQUENCE\s+"?(\w+)"?/i);
    if (match) {
      return {
        type: 'ALTER SEQUENCE',
        statement: withoutComments,
        rollback: `-- ⚠️  MANUAL ROLLBACK REQUIRED: Restore previous settings for sequence "${match[1]}"`,
      };
    }
  }

  // Handle CREATE EXTENSION (note: extension names can contain hyphens)
  if (/^CREATE\s+EXTENSION/i.test(withoutComments)) {
    const match = withoutComments.match(
      /CREATE\s+EXTENSION\s+(?:IF NOT EXISTS\s+)?"?([\w-]+)"?/i,
    );
    if (match) {
      return {
        type: 'CREATE EXTENSION',
        statement: withoutComments,
        rollback: `DROP EXTENSION IF EXISTS "${match[1]}";`,
      };
    }
  }

  // Handle DROP EXTENSION (note: extension names can contain hyphens)
  if (/^DROP\s+EXTENSION/i.test(withoutComments)) {
    const match = withoutComments.match(
      /DROP\s+EXTENSION\s+(?:IF EXISTS\s+)?"?([\w-]+)"?/i,
    );
    if (match) {
      return {
        type: 'DROP EXTENSION',
        statement: withoutComments,
        rollback: `CREATE EXTENSION IF NOT EXISTS "${match[1]}";`,
      };
    }
  }

  // Handle CREATE VIEW
  if (/^CREATE\s+(OR REPLACE\s+)?VIEW/i.test(withoutComments)) {
    const match = withoutComments.match(
      /CREATE\s+(?:OR REPLACE\s+)?VIEW\s+"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'CREATE VIEW',
        statement: withoutComments,
        rollback: `DROP VIEW IF EXISTS "${match[1]}";`,
      };
    }
  }

  // Handle DROP VIEW
  if (/^DROP\s+VIEW/i.test(withoutComments)) {
    const match = withoutComments.match(
      /DROP\s+VIEW\s+(?:IF EXISTS\s+)?"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'DROP VIEW',
        statement: withoutComments,
        rollback: `-- ⚠️  MANUAL ROLLBACK REQUIRED: Recreate view "${match[1]}" with original definition`,
      };
    }
  }

  // Handle CREATE MATERIALIZED VIEW
  if (/^CREATE\s+MATERIALIZED\s+VIEW/i.test(withoutComments)) {
    const match = withoutComments.match(
      /CREATE\s+MATERIALIZED\s+VIEW\s+"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'CREATE MATERIALIZED VIEW',
        statement: withoutComments,
        rollback: `DROP MATERIALIZED VIEW IF EXISTS "${match[1]}";`,
      };
    }
  }

  // Handle DROP MATERIALIZED VIEW
  if (/^DROP\s+MATERIALIZED\s+VIEW/i.test(withoutComments)) {
    const match = withoutComments.match(
      /DROP\s+MATERIALIZED\s+VIEW\s+(?:IF EXISTS\s+)?"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'DROP MATERIALIZED VIEW',
        statement: withoutComments,
        rollback: `-- ⚠️  MANUAL ROLLBACK REQUIRED: Recreate materialized view "${match[1]}"`,
      };
    }
  }

  // Handle CREATE FUNCTION
  if (/^CREATE\s+(OR REPLACE\s+)?FUNCTION/i.test(withoutComments)) {
    const match = withoutComments.match(
      /CREATE\s+(?:OR REPLACE\s+)?FUNCTION\s+"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'CREATE FUNCTION',
        statement: withoutComments,
        rollback: `DROP FUNCTION IF EXISTS "${match[1]}";`,
      };
    }
  }

  // Handle DROP FUNCTION
  if (/^DROP\s+FUNCTION/i.test(withoutComments)) {
    const match = withoutComments.match(
      /DROP\s+FUNCTION\s+(?:IF EXISTS\s+)?"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'DROP FUNCTION',
        statement: withoutComments,
        rollback: `-- ⚠️  MANUAL ROLLBACK REQUIRED: Recreate function "${match[1]}"`,
      };
    }
  }

  // Handle CREATE PROCEDURE
  if (/^CREATE\s+(OR REPLACE\s+)?PROCEDURE/i.test(withoutComments)) {
    const match = withoutComments.match(
      /CREATE\s+(?:OR REPLACE\s+)?PROCEDURE\s+"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'CREATE PROCEDURE',
        statement: withoutComments,
        rollback: `DROP PROCEDURE IF EXISTS "${match[1]}";`,
      };
    }
  }

  // Handle DROP PROCEDURE
  if (/^DROP\s+PROCEDURE/i.test(withoutComments)) {
    const match = withoutComments.match(
      /DROP\s+PROCEDURE\s+(?:IF EXISTS\s+)?"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'DROP PROCEDURE',
        statement: withoutComments,
        rollback: `-- ⚠️  MANUAL ROLLBACK REQUIRED: Recreate procedure "${match[1]}"`,
      };
    }
  }

  // Handle CREATE TRIGGER
  if (/^CREATE\s+(OR REPLACE\s+)?TRIGGER/i.test(withoutComments)) {
    const match = withoutComments.match(
      /CREATE\s+(?:OR REPLACE\s+)?TRIGGER\s+"?(\w+)"?/i,
    );
    const tableMatch = withoutComments.match(/ON\s+"?(\w+)"?/i);
    if (match) {
      const tableName = tableMatch?.[1] || 'table';
      return {
        type: 'CREATE TRIGGER',
        statement: withoutComments,
        rollback: `DROP TRIGGER IF EXISTS "${match[1]}" ON "${tableName}";`,
      };
    }
  }

  // Handle DROP TRIGGER
  if (/^DROP\s+TRIGGER/i.test(withoutComments)) {
    const match = withoutComments.match(
      /DROP\s+TRIGGER\s+(?:IF EXISTS\s+)?"?(\w+)"?\s+ON\s+"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'DROP TRIGGER',
        statement: withoutComments,
        rollback: `-- ⚠️  MANUAL ROLLBACK REQUIRED: Recreate trigger "${match[1]}" on "${match[2]}"`,
      };
    }
  }

  // Handle CREATE POLICY (Row Level Security)
  if (/^CREATE\s+POLICY/i.test(withoutComments)) {
    const match = withoutComments.match(
      /CREATE\s+POLICY\s+"?(\w+)"?\s+ON\s+"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'CREATE POLICY',
        statement: withoutComments,
        rollback: `DROP POLICY IF EXISTS "${match[1]}" ON "${match[2]}";`,
      };
    }
  }

  // Handle DROP POLICY
  if (/^DROP\s+POLICY/i.test(withoutComments)) {
    const match = withoutComments.match(
      /DROP\s+POLICY\s+(?:IF EXISTS\s+)?"?(\w+)"?\s+ON\s+"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'DROP POLICY',
        statement: withoutComments,
        rollback: `-- ⚠️  MANUAL ROLLBACK REQUIRED: Recreate policy "${match[1]}" on "${match[2]}"`,
      };
    }
  }

  // Handle ALTER TABLE ENABLE/DISABLE ROW LEVEL SECURITY
  if (/ALTER TABLE.*ENABLE ROW LEVEL SECURITY/i.test(withoutComments)) {
    const match = withoutComments.match(
      /ALTER TABLE\s+"?(\w+)"?\s+ENABLE ROW LEVEL SECURITY/i,
    );
    if (match) {
      return {
        type: 'ENABLE RLS',
        statement: withoutComments,
        rollback: `ALTER TABLE "${match[1]}" DISABLE ROW LEVEL SECURITY;`,
      };
    }
  }

  if (/ALTER TABLE.*DISABLE ROW LEVEL SECURITY/i.test(withoutComments)) {
    const match = withoutComments.match(
      /ALTER TABLE\s+"?(\w+)"?\s+DISABLE ROW LEVEL SECURITY/i,
    );
    if (match) {
      return {
        type: 'DISABLE RLS',
        statement: withoutComments,
        rollback: `ALTER TABLE "${match[1]}" ENABLE ROW LEVEL SECURITY;`,
      };
    }
  }

  // Handle GRANT statements
  if (/^GRANT\s+/i.test(withoutComments)) {
    const match = withoutComments.match(
      /GRANT\s+(.+?)\s+ON\s+(.+?)\s+TO\s+"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'GRANT',
        statement: withoutComments,
        rollback: `REVOKE ${match[1]} ON ${match[2]} FROM "${match[3]}";`,
      };
    }
  }

  // Handle REVOKE statements
  if (/^REVOKE\s+/i.test(withoutComments)) {
    const match = withoutComments.match(
      /REVOKE\s+(.+?)\s+ON\s+(.+?)\s+FROM\s+"?(\w+)"?/i,
    );
    if (match) {
      return {
        type: 'REVOKE',
        statement: withoutComments,
        rollback: `GRANT ${match[1]} ON ${match[2]} TO "${match[3]}";`,
      };
    }
  }

  // Handle COMMENT ON statements
  if (/^COMMENT\s+ON/i.test(withoutComments)) {
    const match = withoutComments.match(/COMMENT\s+ON\s+(\w+)\s+"?(\w+)"?/i);
    if (match) {
      return {
        type: 'COMMENT',
        statement: withoutComments,
        rollback: `COMMENT ON ${match[1]} "${match[2]}" IS NULL;`,
      };
    }
  }

  // Handle SET statements (configuration)
  if (/^SET\s+/i.test(withoutComments)) {
    return null; // Session-level, no rollback needed
  }

  // Handle compound ALTER TABLE statements with multiple ALTER COLUMN operations
  // e.g., ALTER TABLE "trades" ALTER COLUMN "col1" DROP NOT NULL, ALTER COLUMN "col2" DROP NOT NULL;
  if (/ALTER TABLE.*ALTER COLUMN/i.test(withoutComments)) {
    rollback = parseCompoundAlterTable(withoutComments, catalog);
    return rollback
      ? {
          type: 'ALTER TABLE ALTER COLUMN',
          statement: withoutComments,
          rollback,
        }
      : null;
  }

  // Skip common Prisma migration noise that doesn't need rollback
  if (/^\s*$/m.test(withoutComments)) {
    return null;
  }

  // Generic fallback for unrecognized statements
  return {
    type: 'UNKNOWN',
    statement: withoutComments,
    rollback: `-- ⚠️  MANUAL ROLLBACK REQUIRED for:\n-- ${withoutComments.substring(0, 100).replace(/\n/g, ' ')}...`,
  };
}

function generateRollbackSql(
  migrationSql: string,
  migrationName: string,
): string {
  // Build schema catalog from all previous migrations
  const catalog = buildSchemaCatalog(migrationName);

  // Remove block comments first
  const sqlWithoutBlockComments = migrationSql.replace(/\/\*[\s\S]*?\*\//g, '');

  // Split by semicolons but keep track of statement structure
  const statements = sqlWithoutBlockComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && s.length > 0);

  const parsed: ParsedStatement[] = [];

  for (const statement of statements) {
    const result = parseStatement(statement, catalog);
    if (result) {
      parsed.push(result);
    }
  }

  // Reverse the order for rollback (dependencies)
  const rollbackStatements = parsed.reverse().map((p) => p.rollback);

  const header = `-- Rollback SQL for migration: ${migrationName}
-- Generated: ${new Date().toISOString()}
--
-- This rollback was generated with schema catalog awareness.
-- Dropped columns/indexes/constraints are restored with their original definitions.
--
-- To execute: yarn migrate:rollback ${migrationName}

`;

  return header + rollbackStatements.join('\n\n');
}

function generateForMigration(
  migrationName: string,
  overwrite: boolean = false,
): boolean {
  const migrationDir = path.join(MIGRATIONS_DIR, migrationName);
  const migrationFile = path.join(migrationDir, 'migration.sql');
  const rollbackFile = path.join(migrationDir, 'rollback.sql');

  if (!fs.existsSync(migrationDir)) {
    console.error(`❌ Migration directory not found: ${migrationName}`);
    return false;
  }

  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ migration.sql not found in: ${migrationName}`);
    return false;
  }

  if (fs.existsSync(rollbackFile) && !overwrite) {
    console.log(`⏭️  Skipping ${migrationName} (rollback.sql exists)`);
    return true;
  }

  const migrationSql = fs.readFileSync(migrationFile, 'utf-8');
  const rollbackSql = generateRollbackSql(migrationSql, migrationName);

  fs.writeFileSync(rollbackFile, rollbackSql);
  console.log(`✅ Generated rollback.sql for: ${migrationName}`);

  return true;
}

function generateForAll(overwrite: boolean = false): void {
  console.log('\n🔄 Generating rollback files for all migrations...\n');

  const migrations = getMigrationDirs();
  let success = 0;
  let failed = 0;

  for (const migration of migrations) {
    if (generateForMigration(migration, overwrite)) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`\n📊 Results: ${success} generated, ${failed} failed\n`);
}

function generateForMissing(): void {
  console.log('\n🔄 Generating rollback files for migrations without one...\n');

  const migrations = getMigrationDirs();
  let generated = 0;
  let skipped = 0;

  for (const migration of migrations) {
    const rollbackFile = path.join(MIGRATIONS_DIR, migration, 'rollback.sql');
    if (fs.existsSync(rollbackFile)) {
      skipped++;
      continue;
    }

    if (generateForMigration(migration, false)) {
      generated++;
    }
  }

  console.log(
    `\n📊 Results: ${generated} generated, ${skipped} already existed\n`,
  );
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Prisma Rollback SQL Generator
=============================

Usage:
  npx ts-node scripts/generate-rollback.ts <migration_name>  - Generate for specific migration
  npx ts-node scripts/generate-rollback.ts --all             - Generate for all migrations
  npx ts-node scripts/generate-rollback.ts --missing         - Generate only for migrations without rollback
  npx ts-node scripts/generate-rollback.ts --overwrite       - Regenerate all (overwrites existing)

Examples:
  npx ts-node scripts/generate-rollback.ts 20251130070905_add_email_verification
  npx ts-node scripts/generate-rollback.ts --missing
`);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case '--all':
      generateForAll(false);
      break;
    case '--missing':
      generateForMissing();
      break;
    case '--overwrite':
      generateForAll(true);
      break;
    default:
      generateForMigration(command, args.includes('--force'));
  }
}

// Only run main() when executed directly, not when imported for testing
if (require.main === module) {
  main();
}

// Export functions for testing
export {
  ColumnDefinition,
  EnumDefinition,
  ForeignKeyDefinition,
  generateRollbackSql,
  IndexDefinition,
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
  ParsedStatement,
  parseStatement,
  processMigrationForCatalog,
  SchemaCatalog,
};
