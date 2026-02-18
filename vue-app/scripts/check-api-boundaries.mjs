import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PROJECT_ROOT = process.cwd();
const TARGET_DIRS = [
  join(PROJECT_ROOT, 'src/pages'),
  join(PROJECT_ROOT, 'src/components'),
];

const FILE_EXTENSIONS = new Set(['.ts', '.vue']);
const API_SERVICE_PATH_REGEX = /(^|\/)services\/api\.service(\.ts)?$/;
const API_SERVICE_IMPORT_REGEX = /import\s*{[^}]*\bapiService\b[^}]*}\s*from\s*['"]([^'"]+)['"]/g;

const walk = (dir) => {
  const files = [];

  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    const ext = fullPath.slice(fullPath.lastIndexOf('.'));
    if (!FILE_EXTENSIONS.has(ext)) continue;

    files.push(fullPath);
  }

  return files;
};

const violations = [];

for (const dir of TARGET_DIRS) {
  if (!existsSync(dir)) continue;

  for (const filePath of walk(dir)) {
    const source = readFileSync(filePath, 'utf8');
    const relPath = relative(PROJECT_ROOT, filePath).replaceAll('\\', '/');

    let match = API_SERVICE_IMPORT_REGEX.exec(source);
    while (match) {
      const importSource = match[1];
      if (API_SERVICE_PATH_REGEX.test(importSource)) {
        violations.push({
          file: relPath,
          importSource,
        });
      }

      match = API_SERVICE_IMPORT_REGEX.exec(source);
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture boundary violation: pages/components must not import apiService directly.');
  console.error('Use stores/composables as the data-flow boundary instead.');
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.importSource}`);
  }
  process.exit(1);
}

console.log('API architecture boundary check passed.');
