import logger from '../logs';

const expectedHeaders = [
    'IDs', 'Customer', 'CRN', 'Appointment Date Time', 'Assessor', 'Method',
    'Assessment Type', 'Assessment Centre', 'Cancelled', 'Funder Invoice',
    'Paid', 'Supplier Invoice', 'Organisation', 'Status', 'Delay'
];



export default class Validation {
    public static validate(text: string) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split('\t');

        // Check header match
        if (headers.length !== expectedHeaders.length ||
            !headers.every((h, i) => h === expectedHeaders[i])) {
            console.error('❌ Header mismatch');
            return false;
        }

        // Validate each row
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split('\t');
            if (row.length !== expectedHeaders.length) {
                console.error(`❌ Row ${i} has ${row.length} columns (expected ${expectedHeaders.length})`);
                return false;
            }

            // Validate date format
            const date = row[3];
            if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/.test(date)) {
                console.error(`❌ Invalid date format in row ${i}: ${date}`);
                return false;
            }

            // Validate booleans
            const boolFields = [8, 10]; // Cancelled, Paid
            for (const index of boolFields) {
                if (!['true', 'false'].includes(row[index])) {
                    console.error(`❌ Invalid boolean in row ${i}, column ${expectedHeaders[index]}: ${row[index]}`);
                    return false;
                }
            }
        }

        logger.info('✅ Format is valid');
        return true;
    }
}



