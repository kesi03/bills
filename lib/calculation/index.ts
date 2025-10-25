import * as fsextra from 'fs-extra';
import { resolve } from "path";
import { Config } from '../../models/config';
import { AssessmentRecord } from '../../models/assessment';
import fs from 'fs';
import csv from 'csv-parser';
import { AssessmentType, Invoice, InvoiceItem, InvoiceItemGroup } from '../../models/invoice';
import _, {  } from 'lodash';
import DocManager from '../export/doc';
import ExcelManager from '../export/excel';
import moment from 'moment';
import { HolidayService } from '../holiday';
import { Payload } from '../../models/payload';
import logs from '../logs';

export default class Calculator {
    public static async startInvoice(dataPath: string, configPath: string, range?: number[]) {
        const referenceDate = new Date();
        function getByRange(item: any) {
            if (range) {
                const objDate = moment(`${_.get(item, 'Appointment Date Time')}`).toDate();
                const diffMonths = Math.abs(
                    (referenceDate.getFullYear() - objDate.getFullYear()) * 12 +
                    (referenceDate.getMonth() - objDate.getMonth())
                );
                return diffMonths >= range[0] && diffMonths <= range[1];
            }
        }
        function formatCustomCode(date: Date): string {
            const prefix = 'A2L';
            const month = date.toLocaleString('en-GB', { month: 'short' }); // 'Mar'
            const year = date.getFullYear().toString().slice(-2); // '25'
            return `${prefix}-${month}${year}`;
        }


        try {
            const [config, data, holidays] = await Promise.all([
                Calculator.readConfig(configPath),
                Calculator.readData(dataPath),
                Calculator.readHolidays(`data/holidays.json`)
            ]);

            const groupedByRef = new Map<string, InvoiceItem[]>();

            logs.info('Config:\n'+JSON.stringify(config,null,2))



            const records: AssessmentRecord[] = data
                .filter((item: object) => {
                    if (!_.isEmpty(range)) {
                        return getByRange(item)
                    }
                    return true;
                })
                .map((value: any) => {
                    function getInitials(name: string): string {
                        const parts = name.trim().split(/\s+/); // Split by whitespace
                        const initials = parts.map(part => part[0].toUpperCase()).join('');
                        return initials;
                    }
                    const record: AssessmentRecord = new AssessmentRecord(value);
                    record.assessorAssessmentType = config.getAssessmentTypeByType(record.assessmentType, record.cancelled);
                    const key = config.getAssessmentStringByType(record.assessmentType, record.cancelled);
                    logs.info(key);
                    record.assessorAmount = config.getCostByType(key) ?? 0;

                    record.assessorMonth = record.appointmentDateTime.getMonth() + 1;
                    const initials: string = getInitials(record.assessor)

                    const ref = formatCustomCode(record.appointmentDateTime);
                    logs.info(ref)
                    if (!groupedByRef.has(ref)) {
                        groupedByRef.set(ref, []);
                    }

                    const completedDate: Date = HolidayService.getCompletedDateWithHolidays(record.appointmentDateTime, holidays)
                    const item: InvoiceItem = InvoiceItem.parseFromAssementToInvoice(record, completedDate)

                    groupedByRef.get(ref)!.push(item);
                    record.assessorInvoiceRef = ref;
                    return record;
                })

            // logger.info(groupedByRef);
            Calculator.createInvoice(groupedByRef, config);
        } catch (err) {
            console.error('Error starting invoice:', err);
        }
    }
    public static async readData(configPath: string) {
        return new Promise<any[]>((resolve, error) => {
            const results: any[] = [];
            fs.createReadStream(configPath)
                .pipe(csv({ separator: '\t' }))
                .on('data', (data: any) => {
                    results.push(data);
                })
                .on('end', () => {
                    // Output the results as a table
                    if (results.length > 0) {
                        resolve(results)
                    } else {
                        logs.info('No matching results found.');
                    }
                });
        })
    }

    public static async readConfig(configPath: string) {
        const configSource = await fsextra.readFile(resolve(configPath), 'utf-8');
        const data = JSON.parse(configSource);
        const config: Config = new Config(data);
        return config;
    }

    public static async readHolidays(configPath: string) {
        const configSource = await fsextra.readFile(resolve(configPath), 'utf-8');
        const data = JSON.parse(configSource);
        return data;
    }

    public static async createInvoice(invoiceMap: Map<string, InvoiceItem[]>, config: Config) {
        const currentDate: Date = new Date();
        let counter: number = 0;
        const invoices: Invoice[] = [];
        function parseCodeToDate(code: string): string {
            logs.info(`code: ${code}`)
            const match = code.match(/^[A-Z0-9]+-([A-Za-z]{3,4})(\d{2})$/);
            if (!match) throw new Error('Invalid code format');

            const [_, monthString, yearStr] = match;

            
            const monthStr = monthString.slice(0, 3); // 'Sep' from 'Sept'



            // Convert 2-digit year to full year (assumes 2000–2099)
            const fullYear = parseInt(yearStr, 10) + 2000;

            // Map month abbreviation to number
            const monthMap: Record<string, string> = {
                Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
                Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
            };

            const month = monthMap[monthStr];
            if (!month) throw new Error('Invalid month abbreviation');

            return `${fullYear}-${month}`;
        }
        for (const [ref, items] of invoiceMap.entries()) {
            const invoice: Invoice = new Invoice();
            invoice.address = config.address
            invoice.bank = config.bank;
            invoice.date = currentDate.toISOString();
            invoice.ref = ref;
            logs.info(ref)
            invoice.period = parseCodeToDate(ref) ;
            invoice.assessments = items.filter((item: InvoiceItem) => {
                return item.assessmentType == AssessmentType.ASSESSMENT
            }).map((item: InvoiceItem, index: number, array: InvoiceItem[]) => {
                const totalAmount = array.reduce((sum, item) => sum + item.amount, 0);
                return new InvoiceItemGroup('Assessments', array.length, totalAmount, array);
            })[0];
            invoice.cancelled = items.filter((item: InvoiceItem) => {
                return item.assessmentType == AssessmentType.CANCELLATION
            }).map((item: InvoiceItem, index: number, array: InvoiceItem[]) => {
                const totalAmount = array.reduce((sum, item) => sum + item.amount, 0);
                return new InvoiceItemGroup('Cancellations', array.length, totalAmount, array);
            })[0];
            invoice.reviews = items.filter((item: InvoiceItem) => {
                return item.assessmentType == AssessmentType.REVIEW
            }).map((item: InvoiceItem, index: number, array: InvoiceItem[]) => {
                const totalAmount = array.reduce((sum, item) => sum + item.amount, 0);
                return new InvoiceItemGroup('Reviews', array.length, totalAmount, array);
            })[0];
            invoice.total = items.reduce((sum, item) => sum + item.amount, 0);
            counter++;
            invoice.invoiceNumber = counter;
            //logger.info(invoice)
            DocManager.createDoc(invoice);
            invoices.push(invoice);
        }
        await ExcelManager.createOrUpdateExcel(invoices);
        await ExcelManager.createOrUpdateFromtemplate(invoices);
    }

    public static async updateInvoice(Payload:Payload, Config:Config): Promise<void> {
        await ExcelManager.updateInvoicesExcel(Payload);
        await ExcelManager.updateInvoice(Payload, Config);
    }
}