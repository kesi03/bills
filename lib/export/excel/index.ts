import { parse, resolve } from "path";
import ExcelJS from 'exceljs';
import fs from 'fs';
import { AssessmentType, Invoice, InvoiceItem, InvoiceItemGroup } from "../../../models/invoice";
import _, { get } from 'lodash'
import moment from "moment";
import { Styles } from "../../../style/excel";
import { Payload } from "../../../models/payload";
import { Config } from "../../../models/config";
import DocManager from "../doc";



export default class ExcelManager {
    public static async createOrUpdateFromtemplate(invoices: Invoice[]) {


        const invoice: Invoice = invoices[0];

        invoices.forEach(async (invoice: Invoice) => {
            const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
            let sheet = workbook.addWorksheet('Invoice');
            if (sheet) {
                // set column widths
                sheet.getColumn('B').width = 30
                sheet.getColumn('C').width = 30
                sheet.getColumn('D').width = 30
                sheet.getColumn('E').width = 30
                sheet.getColumn('F').width = 20
                sheet.getColumn('G').width = 20
                sheet.getColumn('H').width = 20

                sheet.getCell('B2').value = `${invoice.address.name}`
                sheet.getCell('B2').style = Styles.name;
                sheet.getCell('B3').value = 'ADDRESS:'
                sheet.getCell('B3').style = Styles.bold;
                sheet.getCell('C3').value = `${invoice.address.address} , ${invoice.address.postCode} , ${invoice.address.city}`;
                sheet.getCell('C3').style = Styles.normal
                sheet.getCell('B4').value = 'EMAIL:'
                sheet.getCell('B4').style = Styles.bold;
                sheet.getCell('C4').value = `${invoice.address.epost}`;
                sheet.getCell('C4').style = Styles.normal
                sheet.getCell('D4').value = `${invoice.address.workEpost}`;
                sheet.getCell('D4').style = Styles.normal
                sheet.getCell('B5').value = 'TELEPHONE:'
                sheet.getCell('B5').style = Styles.bold;
                sheet.getCell('C5').value = `${invoice.address.telephone}`;
                sheet.getCell('C5').style = Styles.normal
                sheet.getCell('B7').value = 'DATE OF INVOICE:'
                sheet.getCell('B7').style = Styles.bold;
                sheet.getCell('C7').value = new Date(invoice.date).toLocaleDateString('en-GB')
                sheet.getCell('C7').numFmt = 'dd/mm/yyyy'
                sheet.getCell('C7').style = Styles.normal
                sheet.getCell('B8').value = 'INVOICE NUMBER:'
                sheet.getCell('B8').style = Styles.bold;
                sheet.getCell('C8').value = invoice.ref
                sheet.getCell('C8').style = Styles.normal


                // table header
                sheet.getRow(10).height = 20
                sheet.getCell('B10').value = 'PO'
                sheet.getCell('B10').style = Styles.tableHeader;

                sheet.getCell('C10').value = 'Student Name'
                sheet.getCell('C10').style = Styles.tableHeader;
                sheet.getCell('D10').value = 'Assessment Date'
                sheet.getCell('D10').style = Styles.tableHeader;
                sheet.getCell('E10').value = 'Report Submission Date'
                sheet.getCell('E10').style = Styles.tableHeader;
                sheet.getCell('F10').value = 'Assessment Type'
                sheet.getCell('F10').style = Styles.tableHeader;
                sheet.getCell('G10').value = 'Fee'
                sheet.getCell('G10').style = Styles.tableHeader;
                sheet.getCell('H10').value = 'Vat?'
                sheet.getCell('H10').style = Styles.tableHeader;

                const items: InvoiceItem[] = [
                    ...(invoice.assessments?.items ?? []),
                    ...(invoice.reviews?.items ?? []),
                    ...(invoice.cancelled?.items ?? []),
                ];

                const startRow: number = 11;
                let rowIndex: number = 0;

                items.forEach((item: InvoiceItem, index: number) => {
                    rowIndex = startRow + index;
                    sheet.getCell(`C${rowIndex}`).value = item.customer;
                    sheet.getCell(`C${rowIndex}`).style = Styles.normal;
                    sheet.getCell(`D${rowIndex}`).value = item.appointmentDateTime.toLocaleDateString('en-GB');
                    sheet.getCell(`D${rowIndex}`).numFmt = 'dd/mm/yyyy'
                    sheet.getCell(`D${rowIndex}`).style = Styles.normal;
                    sheet.getCell(`E${rowIndex}`).value = item.completedDateTime.toLocaleDateString('en-GB');
                    sheet.getCell(`E${rowIndex}`).numFmt = 'dd/mm/yyyy'
                    sheet.getCell(`E${rowIndex}`).style = Styles.normal;
                    sheet.getCell(`F${rowIndex}`).value = 'Remote';
                    sheet.getCell(`F${rowIndex}`).style = Styles.normal;
                    sheet.getCell(`G${rowIndex}`).value = item.amount;
                    sheet.getCell(`G${rowIndex}`).numFmt = `"£"#,##0.00;[Red]-"£"#,##0.00`
                    sheet.getCell(`G${rowIndex}`).style = Styles.normal;
                    sheet.getCell(`H${rowIndex}`).value = 'N/A';
                    sheet.getCell(`H${rowIndex}`).style = Styles.normal;
                })

                // Add total formula below inserted rows
                const totalRowIndex = startRow + items.length;
                sheet.getCell(`F${totalRowIndex}`).value = 'TOTAL';
                sheet.getCell(`F${totalRowIndex}`).style = Styles.bold;
                sheet.getCell(`G${totalRowIndex}`).value = {
                    formula: `SUM(G${startRow}:G${totalRowIndex - 1})`,
                };
                sheet.getCell(`G${totalRowIndex}`).style = Styles.normal;
                sheet.getCell(`G${totalRowIndex}`).numFmt = `"£"#,##0.00;[Red]-"£"#,##0.00`

                let bankRow: number = totalRowIndex + 3;

                //bank details

                sheet.getCell(`B${bankRow}`).value = 'BANK DETAILS:'
                sheet.getCell(`B${bankRow}`).style = Styles.bold;
                sheet.getCell(`C${bankRow}`).value = invoice.bank.name;
                sheet.getCell(`C${bankRow}`).style = Styles.normal
                bankRow++;
                sheet.getCell(`B${bankRow}`).value = 'ACCOUNT NAME:'
                sheet.getCell(`B${bankRow}`).style = Styles.bold;
                sheet.getCell(`C${bankRow}`).value = invoice.bank.customer;
                sheet.getCell(`C${bankRow}`).style = Styles.normal
                bankRow++;
                sheet.getCell(`B${bankRow}`).value = 'SORT CODE:'
                sheet.getCell(`B${bankRow}`).style = Styles.bold;
                sheet.getCell(`C${bankRow}`).value = invoice.bank.sortCode;
                sheet.getCell(`C${bankRow}`).style = Styles.normal
                bankRow++;
                sheet.getCell(`B${bankRow}`).value = 'ACCOUNT NUMBER:'
                sheet.getCell(`B${bankRow}`).style = Styles.bold;
                sheet.getCell(`C${bankRow}`).value = invoice.bank.account;
                sheet.getCell(`C${bankRow}`).style = Styles.normal

                const outputPath: string = resolve(`data/${invoice.ref}.xlsx`)
                await workbook.xlsx.writeFile(outputPath);

            }
        })


    }


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
            'assessment': 4,
            'submitted': 5,
            'fee': 6,
            'period': 7,
            'type': 8,
            'invoiced': 9,
            'invoice': 10,
            'excluded': 11
        };

        if (!sheet) {
            sheet = workbook.addWorksheet(sheetName);
            sheet.columns = [
                { header: 'CRN', key: 'crn', width: 15 },
                { header: 'id', key: 'id', width: 10 },
                { header: 'Customer', key: 'customer', width: 20 },
                { header: 'Assessment', key: 'assessment', width: 20 },
                { header: 'Submitted', key: 'submitted', width: 20 },
                { header: 'Fee', key: 'fee', width: 10 },
                { header: 'Period', key: 'period', width: 20 },
                { header: 'Type', key: 'type', width: 20 },
                { header: 'Invoiced', key: 'invoiced', width: 20 },
                { header: 'Invoice', key: 'invoice', width: 20 },
                { header: 'Excluded', key: 'excluded', width: 10 },
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
                    existingRow.getCell(columnMap['assessment']).value = `${moment(item.appointmentDateTime).format('DD-MM-YYYY HH:mm')}`;
                    existingRow.getCell(columnMap['submitted']).value = `${moment(item.completedDateTime).format('DD-MM-YYYY')}`;
                    existingRow.getCell(columnMap['fee']).value = item.amount;
                    existingRow.getCell(columnMap['fee']).numFmt = `"£"#,##0.00;[Red]-"£"#,##0.00`
                    existingRow.getCell(columnMap['period']).value = invoice.period;
                    existingRow.getCell(columnMap['type']).value = `${AssessmentType[item.assessmentType]}`;
                    existingRow.getCell(columnMap['invoiced']).value = `${moment(invoice.date).format('DD-MM-YYYY')}`;
                    existingRow.getCell(columnMap['invoice']).value = invoice.ref;
                    existingRow.getCell(columnMap['excluded']).value = 'no';
                } else {
                    const newRow = sheet.addRow({
                        crn: item.crn,
                        id: item.id,
                        customer: item.customer,
                        assessment: `${moment(item.appointmentDateTime).format('DD-MM-YYYY HH:mm')}`,
                        submitted: `${moment(item.completedDateTime).format('DD-MM-YYYY')}`,
                        fee: item.amount,
                        period: invoice.period,
                        type: `${AssessmentType[item.assessmentType]}`,
                        invoiced: `${moment(invoice.date).format('DD-MM-YYYY')}`,
                        invoice: invoice.ref,
                        excluded: 'no',
                    }
                    );
                    newRow.getCell(columnMap['fee']).numFmt = `"£"#,##0.00;[Red]-"£"#,##0.00`
                }
            });
        }
    }


    public static async updateInvoicesExcel(payload: Payload): Promise<void> {
        const filePath = resolve('data/invoices.xlsx');
        const workbook = new ExcelJS.Workbook();

        if (!fs.existsSync(filePath)) {
            console.warn(`Excel file not found at ${filePath}`);
            return;
        }

        await workbook.xlsx.readFile(filePath);

        const getColumn = (sheet: ExcelJS.Worksheet, 
            columnName: string) => {
             const headerRow = sheet.getRow(1);
            const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
            const columnIndex = headerValues.findIndex(v => String(v) === String(columnName));
            if (columnIndex === -1) {
                console.warn(`Column "${columnName}" not found in sheet "${sheet.name}".`);
                return -1;
            }
            return columnIndex;
        };

        const updateSheet = (sheetName: string) => {
            const sheet = workbook.getWorksheet(sheetName);
            if (!sheet) {
                console.warn(`Sheet "${sheetName}" not found.`);
                return;
            }

            const columnIndex = getColumn(sheet, payload.key);
            if (columnIndex === -1) return;

            let targetRow: ExcelJS.Row | undefined;
            sheet.eachRow((row) => {
                if (row.getCell(1).value === payload.id) {
                    targetRow = row;
                }
            });

            if (!targetRow) {
                console.warn(`Row with ID "${payload.id}" not found in sheet "${sheetName}".`);
                return;
            }

            targetRow.getCell(columnIndex).value = payload.value;
            targetRow.commit();
        };

        updateSheet('ALL');
        updateSheet(payload.ref);

        await workbook.xlsx.writeFile(filePath);
    }

    public static async updateInvoice(payload: Payload, config:Config): Promise<void> {
        const filePath = resolve('data/invoices.xlsx');
        const workbook = new ExcelJS.Workbook();

        if (!fs.existsSync(filePath)) {
            console.warn(`Excel file not found at ${filePath}`);
            return;
        }

        await workbook.xlsx.readFile(filePath);

        let sheet = workbook.getWorksheet(payload.ref);
        if (!sheet) {
            console.warn(`Sheet "${payload.ref}" not found.`);
            return
        }

        const invoices: Invoice[] = [];

        const invoice: Invoice = new Invoice();
        invoice.ref = payload.ref;
        invoice.address = config.address;
        invoice.bank = config.bank;
        invoice.date = new Date().toISOString();

        const items: InvoiceItem[] = [];

        

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // skip header row
            if(row.getCell(11).value !== 'no') return; // skip excluded rows

            const appointmentDateTime = row.getCell(4).value as string
            const completedDateTime = row.getCell(5).value as string;
            const amount = row.getCell(6).value;

            const item: InvoiceItem = InvoiceItem.parseFromRecordToInvoice({
                id: row.getCell(2).value,
                customer: row.getCell(3).value,
                crn: row.getCell(1).value,
                appointmentDateTime: moment(appointmentDateTime, "DD-MM-YYYY HH:mm").toDate(),
                completedDateTime: moment(completedDateTime, "DD-MM-YYYY").toDate(),
                assessmentType: row.getCell(8).value,
                amount: parseFloat(amount as string),
            });
            
            
            items.push(item);
            invoice.period = row.getCell(7).value as string;
        });
        invoice.assessments = new InvoiceItemGroup("Assessments", items.length, _.sumBy(items, 'amount'), items);
        invoice.total = _.sumBy(items, 'amount');

        invoices.push(invoice);

        await ExcelManager.createOrUpdateFromtemplate(invoices);
        await DocManager.createDoc(invoice);
    }
}