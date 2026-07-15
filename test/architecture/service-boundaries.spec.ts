import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function typescriptFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) {
        return typescriptFiles(path);
      }
      return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
    }),
  );
  return nested.flat();
}

async function combinedSource(root: string): Promise<string> {
  const files = await typescriptFiles(root);
  return (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join(
    '\n',
  );
}

describe('service boundaries', () => {
  it('API does not import delivery application implementation', async () => {
    const source = await combinedSource('apps/api-service/src');
    expect(source).not.toMatch(/apps\/delivery-service|delivery-service\/src/);
    expect(source).not.toMatch(/entities\/delivery-attempt|DeliveryAttemptService/);
  });

  it('delivery service does not import API entities or providers', async () => {
    const source = await combinedSource('apps/delivery-service/src');
    expect(source).not.toMatch(/apps\/api-service|api-service\/src/);
    expect(source).not.toMatch(/\b(User|WebhookEvent|WebhookSubscription)\b.*from/);
  });

  it('contracts contain no NestJS or TypeORM dependency', async () => {
    const source = await combinedSource('libs/contracts/src');
    expect(source).not.toMatch(/@nestjs|typeorm/);
  });
});
