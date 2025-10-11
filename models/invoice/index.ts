import { AssessmentRecord } from "../assessment";

export enum AssessmentType{
    ASSESSMENT,
    REVIEW,
    CANCELLATION
}


export interface IInvoiceItem{
    crn: string;
    appointmentDateTime: Date;
    assessmentType:AssessmentType;
    amount:number;
}


export interface IInvoiceItemGroup {
  title: string;
  count: number;
  amount: number;
  items: any[]; 
}

export interface IInvoice {
  invoiceNumber: number;
  date: string; // ISO date string
  period: string;
  ref: string;
  assessments: IInvoiceItemGroup;
  reviews: IInvoiceItemGroup;
  cancelled: IInvoiceItemGroup;
  total: number;
  address: IInvoiceAddress;
}

export interface IInvoiceData {
  invoices: IInvoice[];
  lastInvoice: number;
}

export class InvoiceItem implements IInvoiceItem{
    crn: string;
    appointmentDateTime: Date;
    assessmentType: AssessmentType;
    amount: number;
    constructor(crn:string,appointmentDateTime:Date,assessmentType:AssessmentType,amount:number){
        this.crn= crn ;
        this.appointmentDateTime= appointmentDateTime;
        this.assessmentType= assessmentType;
        this.amount = amount;
    } 

    public static parseFromAssementToInvoice( record:Partial<AssessmentRecord>){
        const recordCrn:string=record.crn ?? '';
        const recordAppDate: Date = record.appointmentDateTime ?? new Date();
        const assessmentType: AssessmentType= record.assessorAssessmentType ?? AssessmentType.ASSESSMENT;
        const amount: number = record.assessorAmount ?? 0;
        return new InvoiceItem(recordCrn,recordAppDate,assessmentType,amount);
    }
}

export class InvoiceItemGroup implements IInvoiceItemGroup {
  title: string;
  count: number;
  amount: number;
  items: any[];

  constructor(title:string,count: number, amount: number, items: any[]) {
    this.title = title;
    this.count = count;
    this.amount = amount;
    this.items = items;
  }
}

export interface IInvoiceAddress{
    name: string;
    epost: string;
    address: string;
    city: string;
    postCode: string;
}

export class InvoiceAddress implements IInvoiceAddress{
  name!: string;
  epost!: string;
  address!: string;
  city!: string;
  postCode!: string;
  
}

export class Invoice implements IInvoice {
  invoiceNumber!: number;
  date!: string;
  period!: string;
  ref!: string;
  assessments!: InvoiceItemGroup;
  reviews!: InvoiceItemGroup;
  cancelled!: InvoiceItemGroup;
  total!: number;
  address!: InvoiceAddress;  
}

export class InvoiceData implements IInvoiceData {
  invoices: Invoice[];
  lastInvoice: number;

  constructor(invoices: Invoice[], lastInvoice: number) {
    this.invoices = invoices;
    this.lastInvoice = lastInvoice;
  }
}