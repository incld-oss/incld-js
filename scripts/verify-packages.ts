import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = resolve(import.meta.dir, '..');
const packagesDirectory = resolve(root, 'packages');
const problems: string[] = [];

for (const directory of readdirSync(packagesDirectory, {withFileTypes: true})) {
  if (!directory.isDirectory()) continue;

  const manifestPath = resolve(packagesDirectory, directory.name, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    name?: string;
    private?: boolean;
    files?: string[];
    license?: string;
    repository?: {url?: string; directory?: string};
    publishConfig?: {access?: string};
    dependencies?: Record<string, string>;
  };

  if (manifest.private) continue;
  const label = manifest.name ?? directory.name;

  if (manifest.license !== 'MIT') problems.push(`${label}: missing MIT license metadata`);
  if (!existsSync(resolve(packagesDirectory, directory.name, 'LICENSE'))) {
    problems.push(`${label}: LICENSE is missing from the package directory`);
  }
  if (!manifest.files?.includes('dist')) problems.push(`${label}: dist is not allowlisted for publication`);
  if (manifest.publishConfig?.access !== 'public') problems.push(`${label}: public npm access is not explicit`);
  if (manifest.repository?.url !== 'git+https://github.com/incld-dev/incld-js.git') {
    problems.push(`${label}: repository URL does not match the trusted publisher repository`);
  }
  if (!manifest.repository?.directory) problems.push(`${label}: repository directory is missing`);

  for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
    if (version.startsWith('workspace:')) {
      problems.push(`${label}: ${dependency} would publish with unsupported ${version}`);
    }
  }
}

if (problems.length) {
  throw new Error(`Package verification failed:\n- ${problems.join('\n- ')}`);
}

console.log('Public package manifests are ready for npm packaging.');
