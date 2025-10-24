import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import semver from 'semver';
import logger from '../logs';


export default async function bumpVersion() {
  const pkgPath = path.resolve('package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  const { bump } = await inquirer.prompt([
    {
      type: 'list',
      name: 'bump',
      message: `Current version is ${pkg.version}. Bump version?`,
      choices: ['patch', 'minor', 'major', 'no'],
      default: 'no',
    },
  ]);

  if (bump !== 'no') {
    const newVersion = semver.inc(pkg.version, bump);
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    logger.info(`✅ Version bumped to ${newVersion}`);
  } else {
    logger.info('🛑 No version change.');
  }

}