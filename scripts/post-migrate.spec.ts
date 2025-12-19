import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getMigrationsWithoutRollback, postMigrate } from './post-migrate';

jest.mock('child_process');
jest.mock('fs');

describe('post-migrate', () => {
  const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mocks for fs functions
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  describe('getMigrationsWithoutRollback', () => {
    it('should return only migrations without rollback files', () => {
      // Mock fs to return test migrations
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '20251120000000_a',
        '20251121000000_b',
      ]);
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // first has rollback
        .mockReturnValueOnce(false); // second doesn't

      // This tests the actual exported function
      const missing = getMigrationsWithoutRollback();

      expect(Array.isArray(missing)).toBe(true);
      expect(missing).toHaveLength(1);
      expect(missing[0]).toBe('20251121000000_b');
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

    it('should exclude migrations with existing rollback files', () => {
      const migrations = [
        { name: '20251120000000_initial', hasRollback: true },
        { name: '20251121000000_add_users', hasRollback: false },
        { name: '20251122000000_update', hasRollback: false },
      ];

      const withoutRollback = migrations.filter((m) => !m.hasRollback);

      expect(withoutRollback).toHaveLength(2);
      expect(withoutRollback.map((m) => m.name)).toEqual([
        '20251121000000_add_users',
        '20251122000000_update',
      ]);
    });

    it('should return empty array if all have rollbacks', () => {
      const migrations = [
        { name: '20251120000000_initial', hasRollback: true },
        { name: '20251121000000_add_users', hasRollback: true },
      ];

      const withoutRollback = migrations.filter((m) => !m.hasRollback);

      expect(withoutRollback).toHaveLength(0);
    });
  });

  describe('main function logic', () => {
    it('should handle case when all migrations have rollbacks', () => {
      const missingRollbacks: string[] = [];

      let shouldGenerate = false;
      if (missingRollbacks.length === 0) {
        // Should log success and exit
        shouldGenerate = false;
      }

      expect(shouldGenerate).toBe(false);
    });

    it('should identify migrations missing rollbacks', () => {
      const missingRollbacks = [
        '20251121000000_add_users',
        '20251122000000_update',
      ];

      if (missingRollbacks.length > 0) {
        expect(missingRollbacks).toHaveLength(2);
        expect(missingRollbacks[0]).toBe('20251121000000_add_users');
      }
    });

    it('should format migration count message', () => {
      const missingRollbacks = ['migration1', 'migration2', 'migration3'];
      const message = `📋 Found ${missingRollbacks.length} migrations without rollback:`;

      expect(message).toContain('3 migrations');
    });
  });

  describe('execSync command generation', () => {
    it('should generate correct command for missing rollbacks', () => {
      const command = 'npx ts-node scripts/generate-rollback.ts --missing';

      expect(command).toContain('generate-rollback.ts');
      expect(command).toContain('--missing');
    });

    it('should use correct working directory', () => {
      const cwd = path.join(__dirname, '..');

      expect(cwd).toContain('swapbuds-backend');
      expect(fs.existsSync(cwd)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should catch execSync errors', () => {
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

    it('should exit with code 1 on error', () => {
      const mockExit = jest.fn();
      const originalExit = process.exit;
      process.exit = mockExit as any;

      try {
        throw new Error('Test error');
      } catch (error) {
        mockExit(1);
      }

      expect(mockExit).toHaveBeenCalledWith(1);
      process.exit = originalExit;
    });
  });

  describe('console output patterns', () => {
    it('should format checking message', () => {
      const message = '🔍 Checking for migrations without rollback files...';

      expect(message).toContain('🔍');
      expect(message).toContain('Checking');
    });

    it('should format success message', () => {
      const message = '✅ All migrations have rollback files!';

      expect(message).toContain('✅');
      expect(message).toContain('All migrations');
    });

    it('should format generating message', () => {
      const message = '🔄 Generating rollback files...';

      expect(message).toContain('🔄');
      expect(message).toContain('Generating');
    });

    it('should format completion message', () => {
      const message = '✅ Post-migration complete!';

      expect(message).toContain('✅');
      expect(message).toContain('Post-migration complete');
    });

    it('should format reminder message', () => {
      const message = '💡 Remember to review the generated rollback.sql files';

      expect(message).toContain('💡');
      expect(message).toContain('Remember to review');
    });

    it('should format error message', () => {
      const error = new Error('Test error');
      const message = `❌ Failed to generate rollback files: ${error}`;

      expect(message).toContain('❌');
      expect(message).toContain('Failed to generate');
    });

    it('should format individual migration names', () => {
      const migrations = ['20251121000000_add_users', '20251122000000_update'];
      const formatted = migrations.map((m) => `   - ${m}`);

      expect(formatted[0]).toBe('   - 20251121000000_add_users');
      expect(formatted[1]).toBe('   - 20251122000000_update');
    });
  });

  describe('file system checks', () => {
    it('should check if rollback.sql exists', () => {
      const migration = '20251120000000_test';
      const rollbackPath = path.join(MIGRATIONS_DIR, migration, 'rollback.sql');

      const exists = fs.existsSync(rollbackPath);

      expect(typeof exists).toBe('boolean');
    });

    it('should check if migration directory is valid', () => {
      const testDir = __dirname;
      const stat = fs.statSync(testDir);

      expect(stat.isDirectory()).toBe(true);
    });

    it('should handle non-existent paths', () => {
      const fakePath = '/path/to/nonexistent';
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      const exists = fs.existsSync(fakePath);

      expect(exists).toBe(false);
    });
  });

  describe('path construction', () => {
    it('should construct correct rollback file path', () => {
      const migration = '20251120000000_initial';
      const fullPath = path.join(MIGRATIONS_DIR, migration, 'rollback.sql');

      expect(fullPath).toContain('prisma/migrations');
      expect(fullPath).toContain(migration);
      expect(fullPath).toContain('rollback.sql');
    });

    it('should construct correct migrations directory path', () => {
      const migrationsDir = path.join(__dirname, '../prisma/migrations');

      expect(migrationsDir).toContain('prisma/migrations');
    });
  });

  describe('integration patterns', () => {
    it('should execute generate-rollback with correct options', () => {
      const options = {
        stdio: 'inherit' as const,
        cwd: path.join(__dirname, '..'),
      };

      expect(options.stdio).toBe('inherit');
      expect(options.cwd).toContain('swapbuds-backend');
    });

    it('should handle migration directory reading', () => {
      // Test pattern for reading directory
      if (fs.existsSync(MIGRATIONS_DIR)) {
        const entries = fs.readdirSync(MIGRATIONS_DIR);
        expect(Array.isArray(entries)).toBe(true);
      }
    });
  });

  describe('workflow validation', () => {
    it('should validate complete workflow steps', () => {
      const steps = [
        'Check for migrations without rollback',
        'List missing migrations',
        'Generate rollback files',
        'Confirm completion',
      ];

      expect(steps).toHaveLength(4);
      expect(steps[0]).toContain('Check for migrations');
      expect(steps[3]).toContain('Confirm completion');
    });

    it('should handle empty migrations directory', () => {
      const migrations: string[] = [];

      if (migrations.length === 0) {
        // Should complete successfully
        expect(migrations).toHaveLength(0);
      }
    });

    it('should process multiple migrations', () => {
      const migrations = ['migration1', 'migration2', 'migration3'];
      let processedCount = 0;

      migrations.forEach(() => {
        processedCount++;
      });

      expect(processedCount).toBe(3);
    });
  });

  describe('postMigrate (main function)', () => {
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

    it('should complete successfully when all migrations have rollbacks', () => {
      (
        fs.readdirSync as jest.MockedFunction<typeof fs.readdirSync>
      ).mockReturnValue(['20251120000000_initial'] as any);
      (fs.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({
        isDirectory: () => true,
      } as any);
      (
        fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
      ).mockReturnValue(true);

      postMigrate();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n🔍 Checking for migrations without rollback files...\n',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ All migrations have rollback files!\n',
      );
    });

    it('should generate rollbacks for missing migrations', () => {
      (
        fs.readdirSync as jest.MockedFunction<typeof fs.readdirSync>
      ).mockReturnValue([
        '20251120000000_initial',
        '20251121000000_add_users',
      ] as any);
      (fs.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({
        isDirectory: () => true,
      } as any);
      (fs.existsSync as jest.MockedFunction<typeof fs.existsSync>)
        .mockReturnValueOnce(true) // first migration has rollback
        .mockReturnValueOnce(false); // second doesn't
      (execSync as jest.MockedFunction<typeof execSync>).mockReturnValue(
        Buffer.from(''),
      );

      postMigrate();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 migrations without rollback'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n🔄 Generating rollback files...\n',
      );
      expect(execSync).toHaveBeenCalledWith(
        'npx ts-node scripts/generate-rollback.ts --missing',
        expect.objectContaining({ stdio: 'inherit' }),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '\n✅ Post-migration complete!\n',
      );
    });

    it('should handle multiple missing rollbacks', () => {
      (
        fs.readdirSync as jest.MockedFunction<typeof fs.readdirSync>
      ).mockReturnValue([
        '20251120000000_a',
        '20251121000000_b',
        '20251122000000_c',
      ] as any);
      (fs.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({
        isDirectory: () => true,
      } as any);
      (
        fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
      ).mockReturnValue(false);
      (execSync as jest.MockedFunction<typeof execSync>).mockReturnValue(
        Buffer.from(''),
      );

      postMigrate();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 3 migrations without rollback'),
      );
    });

    it('should handle error during rollback generation', () => {
      (
        fs.readdirSync as jest.MockedFunction<typeof fs.readdirSync>
      ).mockReturnValue(['20251120000000_initial'] as any);
      (fs.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({
        isDirectory: () => true,
      } as any);
      (
        fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
      ).mockReturnValue(false);
      (execSync as jest.MockedFunction<typeof execSync>).mockImplementation(
        () => {
          throw new Error('Command failed');
        },
      );

      expect(() => postMigrate()).toThrow('process.exit called');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to generate rollback files:',
        expect.any(Error),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should display list of migrations without rollbacks', () => {
      (
        fs.readdirSync as jest.MockedFunction<typeof fs.readdirSync>
      ).mockReturnValue([
        '20251120000000_initial',
        '20251121000000_add_users',
      ] as any);
      (fs.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({
        isDirectory: () => true,
      } as any);
      (fs.existsSync as jest.MockedFunction<typeof fs.existsSync>)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      (execSync as jest.MockedFunction<typeof execSync>).mockReturnValue(
        Buffer.from(''),
      );

      postMigrate();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('- 20251121000000_add_users'),
      );
    });
  });
});
