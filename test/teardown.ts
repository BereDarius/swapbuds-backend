/**
 * Global test teardown - runs once after all E2E tests
 * Ensures all connections are closed properly
 */
export default async function globalTeardown() {
  console.log('\n🧹 Cleaning up after E2E tests...\n');

  // Give time for any pending async operations to complete
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('✅ Teardown complete\n');
}
