import { resolve } from "path";
import ExcelJS from 'exceljs';
import fs from 'fs';
import { AssessmentType, Invoice, InvoiceItem } from "../../../models/invoice";
import _ from 'lodash'
import moment from "moment";



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
            ExcelManager.updateSheet(workbook, 'ALL', invoice);
            ExcelManager.updateSheet(workbook, `${invoice.ref}`, invoice);
        })

        await workbook.xlsx.writeFile(filePath);
        console.log('Excel file created:', filePath);
    }



    public static updateSheet(workbook: ExcelJS.Workbook, sheetName: string, invoice: Invoice) {
        let sheet = workbook.getWorksheet(sheetName);

        const columnMap: { [key: string]: number } = {
            'crn': 1,
            'id': 2,
            'customer': 3,
            'date': 4,
            'amount': 5,
            'period': 6,
            'type': 7,
            'invoiced': 8,
            'invoice': 9
        };

        if (!sheet) {
            sheet = workbook.addWorksheet(sheetName);
            sheet.columns = [
                { header: 'CRN', key: 'crn', width: 15 },
                { header: 'id', key: 'id', width: 10 },
                { header: 'Customer', key: 'customer', width: 20 },
                { header: 'Date', key: 'date', width: 20 },
                { header: 'Amount', key: 'amount', width: 10 },
                { header: 'Period', key: 'period', width: 20 },
                { header: 'Type', key: 'type', width: 20 },
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

                    const cellValue = row.getCell(columnMap['crn']).value;
                    if (cellValue === item.crn) {
                        existingRow = row;
                    }
                });

                if (existingRow) {
                    existingRow.getCell(columnMap['id']).value = item.id;
                    existingRow.getCell(columnMap['customer']).value = item.customer;
                    existingRow.getCell(columnMap['date']).value = `${moment(item.appointmentDateTime).format('DD-MM-YYYY HH:mm')}`;
                    existingRow.getCell(columnMap['amount']).value = item.amount;
                    existingRow.getCell(columnMap['amount']).numFmt = `"£"#,##0.00;[Red]-"£"#,##0.00`
                    existingRow.getCell(columnMap['period']).value = invoice.period;
                    existingRow.getCell(columnMap['type']).value = `${AssessmentType[item.assessmentType]}`;
                    existingRow.getCell(columnMap['invoiced']).value = `${moment(invoice.date).format('DD-MM-YYYY')}`;
                    existingRow.getCell(columnMap['invoice']).value = invoice.ref;
                } else {
                    const newRow = sheet.addRow({
                        crn: item.crn,
                        id: item.id,
                        customer: item.customer,
                        date: `${moment(item.appointmentDateTime).format('DD-MM-YYYY HH:mm')}`,
                        amount: item.amount,
                        period: invoice.period,
                        type: `${AssessmentType[item.assessmentType]}`,
                        invoiced: `${moment(invoice.date).format('DD-MM-YYYY')}`,
                        invoice: invoice.ref,
                    }
                    );
                    newRow.getCell(columnMap['amount']).numFmt = `"£"#,##0.00;[Red]-"£"#,##0.00`
                }
            });
        }
    }


}