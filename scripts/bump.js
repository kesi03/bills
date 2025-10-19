const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

async function bumpVersion() {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;

  const { releaseType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'releaseType',
      message: `Current version is ${currentVersion}. Select release type:`,
      choices: ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor'],
    },
  ]);

  const newVersion = semver.inc(currentVersion, releaseType);

  if (!newVersion) {
    console.error('Failed to increment version.');
    return;
  }

  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log(`Version bumped from ${currentVersion} to ${newVersion}`);
}

module.exports = bumpVersion;