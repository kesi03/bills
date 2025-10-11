import { resolve } from "path";
import ExcelJS from 'exceljs';
import fs from 'fs';
import { Invoice, InvoiceItem } from "../../../models/invoice";
import _ from 'lodash'
import { AssessmentRecord } from "../../../models/assessment";



export default class ExcelManager {
    public static async createOrUpdateExcel(invoices: Invoice[]) {
        const filePath: string = resolve('data/invoices.xlsx')
        const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();

        if (fs.existsSync(filePath)) {
            await workbook.xlsx.readFile(filePath);
            console.log('Excel file exists. Updating rows...');
        } else {
            console.log('Creating new Excel file...');
        }

        invoices.forEach((invoice: Invoice) => {
            ExcelManager.updateSheet(workbook, 'all', invoice);
            ExcelManager.updateSheet(workbook, `${invoice.ref}`, invoice);
        })

        await workbook.xlsx.writeFile(filePath);
        console.log('Excel file created:', filePath);
    }

    public static updateSheet(workbook: ExcelJS.Workbook, sheetName: string, invoice: Invoice) {
        let sheet = workbook.getWorksheet(sheetName);
        if (!sheet) {
            sheet = workbook.addWorksheet(sheetName);
            sheet.columns = [
                { header: 'CRN', key: 'crn', width: 15 },
                { header: 'Date', key: 'date', width: 20 },
                { header: 'Amount', key: 'amount', width: 10 },
                { header: 'Period', key: 'period', width: 20 },
                { header: 'Invoiced', key: 'invoiced', width: 20 },
                { header: 'Invoice', key: 'invoice', width: 20 },
            ];
        }

        const allItems: InvoiceItem[] = [
            ...(invoice.assessments?.items ?? []),
            ...(invoice.reviews?.items ?? []),
            ...(invoice.cancelled?.items ?? []),
        ];

        if (sheet) {
            allItems.forEach(item => {
                let existingRow: ExcelJS.Row | undefined;

                // Loop through each row and match by CRN
                sheet.eachRow((row, rowNumber) => {
                    const cellValue = row.getCell('crn').value;
                    if (cellValue === item.crn) {
                        existingRow = row;
                    }
                });

                if (existingRow) {
                    existingRow.getCell('date').value = item.appointmentDateTime;
                    existingRow.getCell('amount').value = item.amount;
                    existingRow.getCell('period').value = invoice.period;
                    existingRow.getCell('invoiced').value = invoice.date;
                    existingRow.getCell('invoice').value = invoice.ref;
                } else {
                    sheet.addRow({
                        crn: item.crn,
                        date: item.appointmentDateTime,
                        amount: item.amount,
                        period: invoice.period,
                        invoiced: invoice.date,
                        invoice: invoice.ref,
                    }
                    );
                }
            });
        }
    }

    
}