import { spawn, execSync } from 'child_process';
import latestVersion from 'latest-version';

function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function getGlobalPackageInfo(pkgName: string): { version: string; path: string } {
  const output = execSync(`pnpm list -g ${pkgName} --json`, { encoding: 'utf8' });
  console.log('Raw pnpm list output:', output);
  const parsed = JSON.parse(output);
  console.log('Parsed global package info:', parsed);
  const pkg = parsed[0];
  if (!pkg?.version || !pkg?.path) {
    throw new Error(`Could not find global info for ${pkgName}`);
  }
  return { version: pkg.version, path: pkg.path };
}

export async function upgrade(): Promise<void> {
  const pkgName = '@mockholm/bills';
  const { version: currentVersion, path: installPath } = getGlobalPackageInfo(pkgName);

  console.log(`🔍 Checking latest version of ${pkgName}...`);

  console.log(`📂 Currently installed at ${installPath}`);

  const latest = await latestVersion(pkgName);

  if (latest === currentVersion) {
    console.log(`✅ Already at latest version (${latest})`);
    return;
  }

  console.log(`⬆️  Upgrading ${pkgName} from ${currentVersion} → ${latest}`);
  console.log(`📦 Installing updated version with pnpm...`);

  await runCommand('pnpm', ['install', '-g', `${pkgName}@${latest}`], process.cwd());

  console.log(`🎉 Upgrade complete! Now at version ${latest}`);
}