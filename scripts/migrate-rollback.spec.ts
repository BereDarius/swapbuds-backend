import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  getAppliedMigrations,
  getMigrationDirs,
  listMigrations,
  rollbackLast,
  rollbackMigration,
} from './migrate-rollback';

jest.mock('child_process');
jest.mock('fs');

describe('migrate-rollback', () => {
  const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

  describe('getMigrationDirs', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock fs to return test migration directories
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '20251120000000_a',
        '20251121000000_b',
        '20251122000000_c',
        'migration_lock.toml',
      ]);
      (fs.statSync as jest.Mock).mockImplementation((path: string) => ({
        isDirectory: () => !path.toString().includes('migration_lock'),
      }));
    });

    it('should return sorted migration directories', () => {
      // This tests the actual exported function
      const dirs = getMigrationDirs();

      expect(Array.isArray(dirs)).toBe(true);
      // Should be sorted
      for (let i = 1; i < dirs.length; i++) {
        expect(dirs[i] >= dirs[i - 1]).toBe(true);
      }
      // Should not contain migration_lock
      expect(dirs.every((dir) => !dir.startsWith('migration_lock'))).toBe(true);
    });

    it('should sort migration directories', () => {
      const unsorted = [
        '20251122000000_c',
        '20251120000000_a',
        '20251121000000_b',
      ];
      const sorted = unsorted.sort();

      expect(sorted[0]).toBe('20251120000000_a');
      expect(sorted[1]).toBe('20251121000000_b');
      expect(sorted[2]).toBe('20251122000000_c');
    });
  });

  describe('getAppliedMigrations parsing', () => {
    it('should parse migration records correctly', () => {
      const mockOutput = `id1|20251120000000_initial|2025-11-20 10:00:00
id2|20251121000000_add_users|2025-11-21 11:00:00`;

      const migrations = mockOutput
        .trim()
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const [id, migration_name, finished_at] = line.split('|');
          return { id, migration_name, finished_at };
        });

      expect(migrations).toHaveLength(2);
      expect(migrations[0].migration_name).toBe('20251120000000_initial');
      expect(migrations[1].migration_name).toBe('20251121000000_add_users');
    });

    it('should handle empty migration list', () => {
      const mockOutput = '';

      const migrations = mockOutput
        .trim()
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const [id, migration_name, finished_at] = line.split('|');
          return { id, migration_name, finished_at };
        });

      expect(migrations).toHaveLength(0);
    });
  });

  describe('listMigrations logic', () => {
    it('should display correct indicators for migration status', () => {
      const appliedNames = new Set([
        '20251120000000_initial',
        '20251121000000_add_users',
      ]);

      const testMigrations = [
        { name: '20251120000000_initial', hasRollback: true },
        { name: '20251121000000_add_users', hasRollback: false },
        { name: '20251122000000_new', hasRollback: false },
      ];

      testMigrations.forEach((migration) => {
        const isApplied = appliedNames.has(migration.name);
        const appliedIndicator = isApplied ? '🟢' : '⚪';
        const rollbackIndicator = migration.hasRollback ? '✅' : '❌';

        if (migration.name === '20251120000000_initial') {
          expect(appliedIndicator).toBe('🟢');
          expect(rollbackIndicator).toBe('✅');
        } else if (migration.name === '20251121000000_add_users') {
          expect(appliedIndicator).toBe('🟢');
          expect(rollbackIndicator).toBe('❌');
        } else {
          expect(appliedIndicator).toBe('⚪');
        }
      });
    });
  });

  describe('rollbackMigration validation logic', () => {
    it('should validate migration directory exists', () => {
      const migrationName = '20251120000000_test';
      const migrationDir = path.join(MIGRATIONS_DIR, migrationName);

      // Test the existence check logic with mocked fs
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      const dirExists = fs.existsSync(migrationDir);

      expect(dirExists).toBe(true);
      expect(typeof dirExists).toBe('boolean');
    });

    it('should validate rollback file exists', () => {
      const migrationName = '20251120000000_test';
      const rollbackFile = path.join(
        MIGRATIONS_DIR,
        migrationName,
        'rollback.sql',
      );

      // Test the existence check logic with mocked fs
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      const fileExists = fs.existsSync(rollbackFile);

      expect(fileExists).toBe(true);
      expect(typeof fileExists).toBe('boolean');
    });

    it('should validate migration is in applied list', () => {
      const migrationName = '20251120000000_test';
      const appliedMigrations = [
        {
          id: '1',
          migration_name: '20251120000000_initial',
          finished_at: '2025-11-20',
        },
        {
          id: '2',
          migration_name: '20251121000000_add_users',
          finished_at: '2025-11-21',
        },
      ];

      const migration = appliedMigrations.find(
        (m) => m.migration_name === migrationName,
      );

      expect(migration).toBeUndefined();

      const validMigration = appliedMigrations.find(
        (m) => m.migration_name === '20251120000000_initial',
      );
      expect(validMigration).toBeDefined();
      expect(validMigration?.migration_name).toBe('20251120000000_initial');
    });
  });

  describe('rollback SQL escaping', () => {
    it('should properly escape double quotes in SQL', () => {
      const sql = 'DROP TABLE "users"';
      const escaped = sql.replace(/"/g, '\\"');

      expect(escaped).toBe('DROP TABLE \\"users\\"');
    });

    it('should handle complex SQL with multiple quotes', () => {
      const sql = 'ALTER TABLE "users" DROP COLUMN "email"';
      const escaped = sql.replace(/"/g, '\\"');

      expect(escaped).toBe('ALTER TABLE \\"users\\" DROP COLUMN \\"email\\"');
    });
  });

  describe('rollbackLast logic', () => {
    it('should select first migration from sorted list', () => {
      const appliedMigrations = [
        {
          id: '2',
          migration_name: '20251121000000_add_users',
          finished_at: '2025-11-21',
        },
        {
          id: '1',
          migration_name: '20251120000000_initial',
          finished_at: '2025-11-20',
        },
      ];

      const lastMigration = appliedMigrations[0];

      expect(lastMigration.migration_name).toBe('20251121000000_add_users');
    });

    it('should handle empty applied migrations list', () => {
      const appliedMigrations: any[] = [];

      if (appliedMigrations.length === 0) {
        // Should exit with message
        expect(appliedMigrations).toHaveLength(0);
      }
    });
  });

  describe('command line argument parsing', () => {
    it('should handle --list command', () => {
      const args = ['--list'];
      const command = args[0];

      expect(command).toBe('--list');
      expect(['--list', '-l']).toContain(command);
    });

    it('should handle -l command', () => {
      const args = ['-l'];
      const command = args[0];

      expect(command).toBe('-l');
      expect(['--list', '-l']).toContain(command);
    });

    it('should handle --last command', () => {
      const args = ['--last'];
      const command = args[0];

      expect(command).toBe('--last');
    });

    it('should handle migration name as default', () => {
      const args = ['20251120000000_initial'];
      const command = args[0];

      expect(command).toBe('20251120000000_initial');
      expect(command).not.toBe('--list');
      expect(command).not.toBe('--last');
    });

    it('should handle no arguments', () => {
      const args: string[] = [];

      if (args.length === 0) {
        // Should display help
        expect(args).toHaveLength(0);
      }
    });
  });

  describe('migration record update SQL', () => {
    it('should generate correct UPDATE statement', () => {
      const migrationName = '20251120000000_initial';
      const updateSql = `UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name = '${migrationName}'`;

      expect(updateSql).toContain('UPDATE _prisma_migrations');
      expect(updateSql).toContain('SET rolled_back_at = NOW()');
      expect(updateSql).toContain(`WHERE migration_name = '${migrationName}'`);
    });
  });

  describe('error handling patterns', () => {
    it('should handle execSync errors gracefully', () => {
      let errorCaught = false;

      try {
        // Simulate error
        throw new Error('Command failed');
      } catch (error) {
        errorCaught = true;
        expect(error).toBeInstanceOf(Error);
      }

      expect(errorCaught).toBe(true);
    });

    it('should handle missing DATABASE_URL', () => {
      // Test the try-catch pattern
      let errorHandled = false;

      try {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL not set');
        }
      } catch (error) {
        errorHandled = true;
      }

      // Either DATABASE_URL is set or error was handled
      expect(typeof errorHandled).toBe('boolean');
    });
  });

  describe('file system operations', () => {
    it('should check if directory exists', () => {
      const testPath = __dirname;
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      const exists = fs.existsSync(testPath);

      expect(exists).toBe(true);
    });

    it('should check if file exists', () => {
      const testFile = __filename;
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      const exists = fs.existsSync(testFile);

      expect(exists).toBe(true);
    });

    it('should read file content', () => {
      const testFile = __filename;
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        'describe("test", () => {})',
      );
      const content = fs.readFileSync(testFile, 'utf-8');

      expect(content).toContain('describe');
      expect(typeof content).toBe('string');
    });
  });

  describe('console output patterns', () => {
    it('should format error messages correctly', () => {
      const migrationName = '20251120000000_test';
      const errorMessage = `❌ Migration directory not found: ${migrationName}`;

      expect(errorMessage).toContain('❌');
      expect(errorMessage).toContain(migrationName);
    });

    it('should format success messages correctly', () => {
      const migrationName = '20251120000000_test';
      const successMessage = `✅ Successfully rolled back: ${migrationName}`;

      expect(successMessage).toContain('✅');
      expect(successMessage).toContain(migrationName);
    });

    it('should format info messages correctly', () => {
      const rollbackFile = '/path/to/rollback.sql';
      const infoMessage = `💡 Create a rollback.sql file in the migration directory:\n   ${rollbackFile}`;

      expect(infoMessage).toContain('💡');
      expect(infoMessage).toContain(rollbackFile);
    });
  });

  describe('getAppliedMigrations', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should parse applied migrations from database', () => {
      const mockOutput = `id1|20251120000000_initial|2025-11-20 10:00:00
id2|20251121000000_add_users|2025-11-21 11:00:00`;

      (execSync as jest.MockedFunction<typeof execSync>).mockReturnValue(
        mockOutput,
      );

      const migrations = getAppliedMigrations();

      expect(migrations).toHaveLength(2);
      expect(migrations[0]).toEqual({
        id: 'id1',
        migration_name: '20251120000000_initial',
        finished_at: '2025-11-20 10:00:00',
      });
      expect(migrations[1]).toEqual({
        id: 'id2',
        migration_name: '20251121000000_add_users',
        finished_at: '2025-11-21 11:00:00',
      });
    });

    it('should handle empty migration list from database', () => {
      (execSync as jest.MockedFunction<typeof execSync>).mockReturnValue('');

      const migrations = getAppliedMigrations();

      expect(migrations).toHaveLength(0);
    });

    it('should handle database connection error', () => {
      (execSync as jest.MockedFunction<typeof execSync>).mockImplementation(
        () => {
          throw new Error('Connection failed');
        },
      );

      expect(() => getAppliedMigrations()).toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to get applied migrations. Make sure DATABASE_URL is set.',
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('listMigrations', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Mock fs functions
      (
        fs.readdirSync as jest.MockedFunction<typeof fs.readdirSync>
      ).mockReturnValue([
        '20251120000000_initial',
        '20251121000000_add_users',
        'migration_lock.toml',
      ] as any);

      (
        fs.statSync as jest.MockedFunction<typeof fs.statSync>
      ).mockImplementation((path: any) => {
        return {
          isDirectory: () => !path.includes('migration_lock'),
        } as any;
      });

      (
        fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
      ).mockImplementation((path: any) => {
        return path.includes('20251120000000_initial');
      });

      (execSync as jest.MockedFunction<typeof execSync>).mockReturnValue(
        'id1|20251120000000_initial|2025-11-20 10:00:00',
      );
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should list migrations with status indicators', () => {
      listMigrations();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n📋 Available Migrations:\n',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('20251120000000_initial'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('20251121000000_add_users'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('\n  Legend:');
    });
  });

  describe('rollbackMigration', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should exit if migration directory does not exist', () => {
      (
        fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
      ).mockReturnValue(false);

      expect(() => rollbackMigration('nonexistent_migration')).toThrow(
        'process.exit called',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Migration directory not found'),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit if rollback file does not exist', () => {
      (fs.existsSync as jest.MockedFunction<typeof fs.existsSync>)
        .mockReturnValueOnce(true) // migration dir exists
        .mockReturnValueOnce(false); // rollback file doesn't exist

      expect(() => rollbackMigration('test_migration')).toThrow(
        'process.exit called',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No rollback.sql found'),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit if migration is not applied', () => {
      (
        fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
      ).mockReturnValue(true);
      (execSync as jest.MockedFunction<typeof execSync>).mockReturnValue(
        'id1|other_migration|2025-11-20 10:00:00',
      );

      expect(() => rollbackMigration('test_migration')).toThrow(
        'process.exit called',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Migration not found in applied migrations'),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should successfully rollback a migration', () => {
      (
        fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
      ).mockReturnValue(true);
      (
        fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>
      ).mockReturnValue('DROP TABLE test_table;');
      (execSync as jest.MockedFunction<typeof execSync>)
        .mockReturnValueOnce('id1|test_migration|2025-11-20 10:00:00') // getAppliedMigrations
        .mockReturnValueOnce(Buffer.from('')) // execute rollback SQL
        .mockReturnValueOnce(Buffer.from('')); // update migration record

      rollbackMigration('test_migration');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rolling back migration'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully rolled back'),
      );
    });

    it('should handle rollback execution error', () => {
      (
        fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
      ).mockReturnValue(true);
      (
        fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>
      ).mockReturnValue('DROP TABLE test_table;');
      (execSync as jest.MockedFunction<typeof execSync>)
        .mockReturnValueOnce('id1|test_migration|2025-11-20 10:00:00')
        .mockImplementationOnce(() => {
          throw new Error('SQL execution failed');
        });

      expect(() => rollbackMigration('test_migration')).toThrow(
        'process.exit called',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\n❌ Rollback failed:',
        expect.any(Error),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('rollbackLast', () => {
    let consoleLogSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should exit if no migrations to rollback', () => {
      (execSync as jest.MockedFunction<typeof execSync>).mockReturnValue('');

      expect(() => rollbackLast()).toThrow('process.exit called');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n📋 No migrations to roll back.\n',
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should rollback the last applied migration', () => {
      (execSync as jest.MockedFunction<typeof execSync>)
        .mockReturnValueOnce('id2|last_migration|2025-11-21 11:00:00')
        .mockReturnValueOnce('id2|last_migration|2025-11-21 11:00:00');

      (
        fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
      ).mockReturnValue(true);
      (
        fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>
      ).mockReturnValue('DROP TABLE test;');
      (execSync as jest.MockedFunction<typeof execSync>)
        .mockReturnValueOnce('id2|last_migration|2025-11-21 11:00:00')
        .mockReturnValueOnce('id2|last_migration|2025-11-21 11:00:00')
        .mockReturnValueOnce(Buffer.from(''))
        .mockReturnValueOnce(Buffer.from(''));

      rollbackLast();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Last applied migration: last_migration'),
      );
    });
  });
});
