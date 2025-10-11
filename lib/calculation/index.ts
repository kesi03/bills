import * as fsextra from 'fs-extra';
import { resolve } from "path";
import { Config } from '../../models/config';
import { AssessmentRecord } from '../../models/assessment';
import fs from 'fs';
import csv from 'csv-parser';
import { AssessmentType, IInvoice, Invoice, InvoiceItem, InvoiceItemGroup } from '../../models/invoice';
import { values } from 'lodash';
import DocManager from '../export/doc';
import ExcelManager from '../export/excel';

export default class Calculator {
    public static async startInvoice(dataPath: string, configPath: string) {
        try {
            const [config, data] = await Promise.all([
                Calculator.readConfig(configPath),
                Calculator.readData(dataPath)
            ]);

            const groupedByRef = new Map<string, InvoiceItem[]>();

            console.log(config)

            const records:AssessmentRecord[]= data.map((value:any)=>{
                const record:AssessmentRecord=new AssessmentRecord(value);
                record.assessorAssessmentType = config.getAssessmentTypeByType(record.assessmentType,record.cancelled);
                const key = config.getAssessmentStringByType(record.assessmentType,record.cancelled);
                console.log(key);
                record.assessorAmount = config.getCostByType(key) ?? 0;
                
                record.assessorMonth = record.appointmentDateTime.getMonth()+1;
                const ref = `AD-${record.appointmentDateTime.getFullYear()}-${record.appointmentDateTime.getMonth()+1}`;
                if (!groupedByRef.has(ref)) {
                    groupedByRef.set(ref, []);
                }

                const item:InvoiceItem = InvoiceItem.parseFromAssementToInvoice(record)

                groupedByRef.get(ref)!.push(item);
                record.assessorInvoiceRef = ref;
                return record;
            })

           // console.log(groupedByRef);
            Calculator.createInvoice(groupedByRef,config);
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
                        console.log('No matching results found.');
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

    public static async createInvoice(invoiceMap:Map<string, InvoiceItem[]>, config:Config) {
       const currentDate:Date = new Date();
       let counter:number = 0;
       const invoices:Invoice[]=[];
       for (const [ref, items] of invoiceMap.entries()) {
            const invoice:Invoice=new Invoice();
            invoice.address = config.address
            invoice.date=currentDate.toISOString();
            invoice.ref= ref;
            invoice.period = ref.split('-')[1];
            invoice.assessments = items.filter((item:InvoiceItem)=>{
                return item.assessmentType == AssessmentType.ASSESSMENT
            }).map((item:InvoiceItem,index:number,array:InvoiceItem[])=>{
                const totalAmount = array.reduce((sum, item) => sum + item.amount, 0);
                return new InvoiceItemGroup('Assessments',array.length,totalAmount,array);
            })[0];
            invoice.cancelled = items.filter((item:InvoiceItem)=>{
                return item.assessmentType == AssessmentType.CANCELLATION
            }).map((item:InvoiceItem,index:number,array:InvoiceItem[])=>{
                const totalAmount = array.reduce((sum, item) => sum + item.amount, 0);
                return new InvoiceItemGroup('Cancellations',array.length,totalAmount,array);
            })[0];
            invoice.reviews = items.filter((item:InvoiceItem)=>{
                return item.assessmentType == AssessmentType.REVIEW
            }).map((item:InvoiceItem,index:number,array:InvoiceItem[])=>{
                const totalAmount = array.reduce((sum, item) => sum + item.amount, 0);
                return new InvoiceItemGroup('Reviews',array.length,totalAmount,array);
            })[0];
            invoice.total = items.reduce((sum, item) => sum + item.amount, 0);
            counter++;
            invoice.invoiceNumber = counter;
            //console.log(invoice)
            DocManager.createDoc(invoice);
            invoices.push(invoice);
        }
        await ExcelManager.createOrUpdateExcel(invoices);
    }
}