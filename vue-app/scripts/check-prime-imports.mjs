import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC_DIR = join(process.cwd(), 'src');

const ALLOWED_IMPORTS = new Set([
  'primevue/config',
  'primevue/toastservice',
  'primevue/confirmationservice',
  'primevue/tooltip',
  'primevue/usetoast',
  'primevue/useconfirm',
  'primevue/chart',
  'primevue/checkbox',
  'primevue/paginator',
  'primevue/message',
  'primevue/toggleswitch',
  'primevue/selectbutton',
  'primevue/skeleton',
  'primevue/menuitem',
  'primevue/tag',
]);

const TEMP_ALLOWLIST = new Set([
  // Keep temporary exceptions here while migrating.
]);

const FILE_EXTENSIONS = new Set(['.ts', '.vue']);

const walk = (dir) => {
  const result = [];

  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      result.push(...walk(fullPath));
      continue;
    }

    const ext = fullPath.slice(fullPath.lastIndexOf('.'));
    if (!FILE_EXTENSIONS.has(ext)) continue;

    result.push(fullPath);
  }

  return result;
};

const importRegex = /from\s+['"](primevue\/[A-Za-z0-9-]+)['"]/g;

const isUiFile = (path) => path.includes('/src/ui/');

const violations = [];

for (const filePath of walk(SRC_DIR)) {
  if (isUiFile(filePath)) continue;

  const relPath = relative(process.cwd(), filePath).replaceAll('\\', '/');
  const source = readFileSync(filePath, 'utf8');

  let match = importRegex.exec(source);
  while (match) {
    const importSource = match[1];

    if (!importSource.startsWith('primevue/')) {
      match = importRegex.exec(source);
      continue;
    }

    if (ALLOWED_IMPORTS.has(importSource) || TEMP_ALLOWLIST.has(relPath)) {
      match = importRegex.exec(source);
      continue;
    }

    violations.push({
      file: relPath,
      importSource,
    });

    match = importRegex.exec(source);
  }
}

if (violations.length > 0) {
  console.error('PrimeVue visual imports are restricted outside src/ui wrappers.');
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.importSource}`);
  }
  process.exit(1);
}

console.log('PrimeVue import policy check passed.');
