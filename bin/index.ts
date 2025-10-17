#!/usr/bin/env node

import fs, { writeFile } from 'fs';
import csv from 'csv-parser';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import HtmlExportManager from '../lib/export/html';
import Calculator from '../lib/calculation';
import { Clipboard } from '@napi-rs/clipboard';
import { HolidayService } from '../lib/holiday';

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
  .command('copy', 'Copy to clipboard', {
    file: {
      alias: 'f',
      description: 'Path to the CSV file',
      type: 'string',
      default: 'data/data-test.csv',
      demandOption: true,
    },
  }, async (argv) => {

    const clipboard = new Clipboard();

    // 📋 Read text from the clipboard
    const text = clipboard.getText();
    console.log('Clipboard text:', text);
  }) .command('holidays', 'Get holidays', {
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
      const [yearOne, yearTwo] =await Promise.all([
        await HolidayService.getPublicHolidays('2024',argv.country),
        await HolidayService.getPublicHolidays('2025',argv.country)
      ]);

      const holidays=[
        ...yearOne,
        ...yearTwo
      ]

      writeFile(`${argv.file}`, JSON.stringify(holidays,null,2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`File created at ${argv.file}`);
    }
  });



  })
  .help()
  .argv;

