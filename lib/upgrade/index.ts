import { spawn } from 'child_process';
import latestVersion from 'latest-version';
import fs from 'fs';
import path from 'path';

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'inherit', shell: true });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

export async function upgrade(): Promise<void> {
  const pkgPath = path.resolve('package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version;
  const name = pkg.name;

  console.log(`🔍 Checking latest version of ${name}...`);

  const latest = await latestVersion(name);

  if (latest === currentVersion) {
    console.log(`✅ Already at latest version (${latest})`);
    return;
  }

  console.log(`⬆️  Upgrading ${name} from ${currentVersion} → ${latest}`);

  pkg.version = latest;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  console.log(`📦 Installing updated version with pnpm...`);
  await runCommand('pnpm', ['install']);

  console.log(`🎉 Upgrade complete! Now at version ${latest}`);
}