import fs from 'fs';
import csv from 'csv-parser';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

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
          console.log(results);
        } else {
          console.log('No matching results found.');
        }
      });
  })
  .help()
  .argv;

