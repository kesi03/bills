#!/usr/bin/env node

import fs, { writeFile } from 'fs';
import csv from 'csv-parser';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import HtmlExportManager from '../lib/export/html';
import Calculator from '../lib/calculation';
import { Clipboard } from '@napi-rs/clipboard';
import { HolidayService } from '../lib/holiday';
import inquirer from 'inquirer';
import path from 'path';
import { hasEmptyValues, promptWithRetry } from '../lib/prompt';
import chalk from 'chalk';
import bumpVersion from '../lib/bump';
import { upgrade } from '../lib/upgrade';

const timestamp = new Date().toISOString()
  .replace(/:/g, '-')        // Replace colons for Windows compatibility
  .replace(/\..+/, '')       // Remove milliseconds
  .replace('T', '_');        // Replace T with underscore

const argv = yargs(hideBin(process.argv))
  .command('filter', 'Filter CSV by column name', {
    file: {
      alias: 'f',
      description: 'Path to the CSV file',
      type: 'string',
      default: 'data/data.csv',
      demandOption: true,
    },
    column: {
      alias: 'c',
      description: 'Name of the column to filter by',
      type: 'string',
      default: 'Cancelled',
      demandOption: true,
    },
    value: {
      alias: 'v',
      description: 'Value to filter by',
      type: 'string',
      default: 'false',
      demandOption: true,
    },
  }, (argv) => {
    const results: any[] = [];

    // Read CSV file and filter by column
    fs.createReadStream(argv.file as string)
      .pipe(csv({ separator: '\t' }))
      .on('data', (data) => {
        if (`${data[argv.column as string]}` === `${argv.value}`) {
          results.push(data);
        }
      })
      .on('end', () => {
        // Output the results as a table
        if (results.length > 0) {
          console.log(JSON.stringify(results));
          HtmlExportManager.export(results);
        } else {
          console.log('No matching results found.');
        }
      });
  })
  .command('invoice', 'Create invoices', {
    data: {
      alias: 'd',
      description: 'Path to the CSV file',
      type: 'string',
      default: 'data/data.csv',
      demandOption: true,
    },
    config: {
      alias: 'c',
      description: 'Config file path',
      type: 'string',
      default: 'data/config.json',
      demandOption: true,
    },
  }, (argv) => {
    const results: any[] = [];
    const range = []
    Calculator.startInvoice(argv.data, argv.config)
  })
  .command(
    'register',
    'Create a config.json file interactively',
    (yargs) =>
      yargs.option('config', {
        alias: 'c',
        description: 'Config file path',
        type: 'string',
        default: 'data/config.json',
        demandOption: true,
      }),
    async (argv) => {

      console.log('Config path:', argv.config);
      const configPath = path.resolve(`${argv.config}`);
      const config: any = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
        : {};

      const completed: string[] = [];

      if (!config.address || hasEmptyValues(config.address)) {
        await promptWithRetry(configPath, [
          { type: 'input', name: 'name', message: 'Name:' },
          { type: 'input', name: 'address', message: 'Street Address:' },
          { type: 'input', name: 'city', message: 'City:' },
          { type: 'input', name: 'postCode', message: 'Post Code:' },
          { type: 'input', name: 'epost', message: 'Email:' },
          { type: 'input', name: 'workEpost', message: 'Work Email:' },
          { type: 'input', name: 'telephone', message: 'Telephone:' },
        ], "address")

      } else {
        completed.push('address');
      }

      if (!config.bank || hasEmptyValues(config.bank)) {
        await promptWithRetry(configPath, [
          { type: 'input', name: 'name', message: 'Bank Name:', default: `${config.bank?.name ?? ''}` },
          { type: 'input', name: 'customer', message: 'Customer Name:', default: `${config.bank?.customer ?? ''}` },
          { type: 'input', name: 'sortCode', message: 'Sort Code:', default: `${config.bank?.sortCode ?? ''}` },
          { type: 'input', name: 'account', message: 'Account Number:', default: `${config.bank?.account ?? ''}` },
        ], "bank")

      } else {
        completed.push('bank');
      }

      if (!config.costs || hasEmptyValues(config.costs)) {
        await promptWithRetry(configPath, [
          {
            type: 'input',
            name: 'cancellation',
            message: 'Cancellation Cost:',
            default: '7.5',
            validate: (input: any) => !isNaN(parseFloat(input)) || 'Please enter a valid number',
            filter: (input: any) => parseFloat(input),
          },
          {
            type: 'input',
            name: 'assessment',
            message: 'Assessment Cost:',
            default: '110',
            validate: (input: any) => !isNaN(parseFloat(input)) || 'Please enter a valid number',
            filter: (input: any) => parseFloat(input),
          },
          {
            type: 'input',
            name: 'review',
            message: 'Review Cost:',
            default: '90',
            validate: (input: any) => !isNaN(parseFloat(input)) || 'Please enter a valid number',
            filter: (input: any) => parseFloat(input),
          },
        ], "costs")

      } else {
        completed.push('costs');
      }

      if (completed.length !== 0) {
        const { section } = await inquirer.prompt([
          {
            type: 'list',
            name: 'section',
            message: 'All sections are complete. Choose one to edit:',
            choices: ['address', 'bank', 'costs', 'all', 'none'],
            default: 'none'
          },
        ]);

        if (section === 'none') {
          console.log('👍 No changes made. Exiting.');
          return;
        }

        const sectionsToEdit = section === 'all' ? ['address', 'bank', 'costs'] : [section];

        for (const key of sectionsToEdit) {
          if (key === 'address') {
            await promptWithRetry(configPath, [
              { type: 'input', name: 'name', message: 'Name:', default: config.address?.name },
              { type: 'input', name: 'address', message: 'Street Address:', default: config.address?.address },
              { type: 'input', name: 'city', message: 'City:', default: config.address?.city },
              { type: 'input', name: 'postCode', message: 'Post Code:', default: config.address?.postCode },
              { type: 'input', name: 'epost', message: 'Email:', default: config.address?.epost },
              { type: 'input', name: 'workEpost', message: 'Work Email:', default: config.address?.workEpost },
              { type: 'input', name: 'telephone', message: 'Telephone:', default: config.address?.telephone },
            ], 'address');
          }

          if (key === 'bank') {
            await promptWithRetry(configPath, [
              { type: 'input', name: 'name', message: 'Bank Name:', default: config.bank?.name },
              { type: 'input', name: 'customer', message: 'Customer Name:', default: config.bank?.customer },
              { type: 'input', name: 'sortCode', message: 'Sort Code:', default: config.bank?.sortCode },
              { type: 'input', name: 'account', message: 'Account Number:', default: config.bank?.account },
            ], 'bank');
          }

          if (key === 'costs') {
            await promptWithRetry(configPath, [
              {
                type: 'input',
                name: 'cancellation',
                message: 'Cancellation Cost:',
                default: config.costs?.cancellation ?? '7.5',
                validate: (input: any) => !isNaN(parseFloat(input)) || 'Please enter a valid number',
                filter: (input: any) => parseFloat(input),
              },
              {
                type: 'input',
                name: 'assessment',
                message: 'Assessment Cost:',
                default: config.costs?.assessment ?? '110',
                validate: (input: any) => !isNaN(parseFloat(input)) || 'Please enter a valid number',
                filter: (input: any) => parseFloat(input),
              },
              {
                type: 'input',
                name: 'review',
                message: 'Review Cost:',
                default: config.costs?.review ?? '90',
                validate: (input: any) => !isNaN(parseFloat(input)) || 'Please enter a valid number',
                filter: (input: any) => parseFloat(input),
              },
            ], 'costs');
          }
        }
      }
    }
  )
  .command('copy', 'Copy to clipboard', {
    data: {
      alias: 'd',
      description: 'Path to the CSV file',
      type: 'string',
      default: `data/data-copied-${timestamp}.csv`,
      demandOption: true,
    },
    config: {
      alias: 'c',
      description: 'Config file path',
      type: 'string',
      default: 'data/config.json',
      demandOption: true,
    },
  }, async (argv) => {

    const clipboard = new Clipboard();

    // 📋 Read text from the clipboard
    const text = clipboard.getText();

    console.log(chalk.hex('#FFA500')('_'.repeat(100)));
    console.log(chalk.cyanBright('\n📋 Pasted content:\n'));
    console.log(chalk.yellowBright(text));
    console.log(chalk.hex('#FFA500')('_'.repeat(100)+'\n'));



    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Is this correct?',
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.redBright('❌ Action cancelled.'));
      return;
    }

    fs.writeFileSync(`${argv.data}`, `${text}`, 'utf8');

    Calculator.startInvoice(argv.data, argv.config)


  }).command('holidays', 'Get holidays', {
    file: {
      alias: 'f',
      description: 'Path to the CSV file',
      type: 'string',
      default: 'data/holidays.json',
      demandOption: true,
    },
    country: {
      alias: 'p',
      description: 'Country',
      type: 'string',
      default: 'GB',
      demandOption: true,
    },
  }, async (argv) => {
    const [yearOne, yearTwo] = await Promise.all([
      await HolidayService.getPublicHolidays('2024', argv.country),
      await HolidayService.getPublicHolidays('2025', argv.country)
    ]);

    const holidays = [
      ...yearOne,
      ...yearTwo
    ]

    writeFile(`${argv.file}`, JSON.stringify(holidays, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
      } else {
        console.log(`File created at ${argv.file}`);
      }
    });
  })
  .command(
  'upgrade',
  'upgrade the CLI to the latest version',
  (yargs) =>{},
    
  async (argv) => {
    upgrade();
  }
).command(
  'bump',
  'bump the version of the CLI',
  (yargs) => {},
    
  async (argv) => {
    bumpVersion();
  }
)
  .help()
  .argv;

