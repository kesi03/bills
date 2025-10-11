import fs from 'fs';
import csv from 'csv-parser';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolve } from 'path';
import HtmlExportManager from '../lib/export/html';
import Calculator from '../lib/calculation';

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
      default:'Cancelled',
      demandOption: true,
    },
    value: {
      alias: 'v',
      description: 'Value to filter by',
      type: 'string',
      default:'false',
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
      default:'data/config.json',
      demandOption: true,
    },
  }, (argv) => {
    const results: any[] = [];
    Calculator.startInvoice(argv.data,argv.config)
  })
  .help()
  .argv;

