import {mkdtempSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const root = resolve(import.meta.dir, '..');
const temporary = mkdtempSync(join(tmpdir(), 'incld-consumer-'));
const tarballs = join(temporary, 'tarballs');
const consumer = join(temporary, 'consumer');
mkdirSync(tarballs);
mkdirSync(consumer);

const packageDirectories = [
  'client',
  'react',
  'react-schedules',
  'react-approvals',
  'audit',
  'react-bulk',
];

function run(command: string, args: string[], cwd = root) {
  const result = spawnSync(command, args, {cwd, encoding: 'utf8', stdio: 'pipe'});
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}${result.stderr}`);
  }
  return result.stdout.trim();
}

const dependencies: Record<string, string> = {
  react: '19.2.8',
  'react-dom': '19.2.8',
};

for (const directory of packageDirectories) {
  const packageDirectory = resolve(root, 'packages', directory);
  const manifest = JSON.parse(readFileSync(resolve(packageDirectory, 'package.json'), 'utf8')) as {
    name: string;
  };
  const output = JSON.parse(run('npm', ['pack', packageDirectory, '--pack-destination', tarballs, '--json']));
  const filename = output[0]?.filename as string | undefined;
  if (!filename) throw new Error(`npm pack did not return a tarball for ${manifest.name}`);
  dependencies[manifest.name] = `file:${join(tarballs, basename(filename))}`;
}

writeFileSync(
  join(consumer, 'package.json'),
  `${JSON.stringify({name: 'incld-clean-consumer', private: true, type: 'module', dependencies}, null, 2)}\n`,
);

writeFileSync(
  join(consumer, 'verify.mjs'),
  [
    "import '@incld/client';",
    "import '@incld/react';",
    "import '@incld/react-schedules';",
    "import '@incld/react-approvals';",
    "import '@incld/react-audit';",
    "import '@incld/react-bulk';",
    "console.log('Clean consumer imported every public package.');",
    '',
  ].join('\n'),
);

run('npm', ['install', '--ignore-scripts'], consumer);
run('npm', ['audit', '--omit=dev'], consumer);
const verification = run('node', ['verify.mjs'], consumer);
console.log(verification);
