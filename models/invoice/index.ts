import { HolidayService } from "../../lib/holiday";
import { AssessmentRecord } from "../assessment";

export enum AssessmentType {
  ASSESSMENT,
  REVIEW,
  CANCELLATION
}


export interface IInvoiceItem {
  id: string;
  customer: string;
  crn: string;
  appointmentDateTime: Date;
  completedDateTime: Date;
  assessmentType: AssessmentType;
  amount: number;
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
  bank:IInvoiceBank;
}

export interface IInvoiceData {
  invoices: IInvoice[];
  lastInvoice: number;
}

export class InvoiceItem implements IInvoiceItem {
  id: string;
  customer: string;
  crn: string;
  appointmentDateTime: Date;
  completedDateTime: Date;
  assessmentType: AssessmentType;
  amount: number;
  constructor(id: string, customer: string, crn: string, appointmentDateTime: Date,completedDateTime: Date, assessmentType: AssessmentType, amount: number) {
    this.id = id;
    this.customer = customer;
    this.crn = crn;
    this.appointmentDateTime = appointmentDateTime;
    this.completedDateTime = completedDateTime;
    this.assessmentType = assessmentType;
    this.amount = amount;
  }

  public static parseFromAssementToInvoice(record: Partial<AssessmentRecord>,completedDate:Date) {
    const recordId: string = record.id ?? '';
    const recordCustomer: string = record.customer ?? '';
    const recordCrn: string = record.crn ?? '';
    const recordAppDate: Date = record.appointmentDateTime ?? new Date();
    const amount: number = record.assessorAmount ?? 0;
    const assessmentType: AssessmentType = record.assessorAssessmentType ?? AssessmentType.ASSESSMENT;
    return new InvoiceItem(recordId, recordCustomer, recordCrn, recordAppDate,completedDate, assessmentType, amount);
  }
}

export class InvoiceItemGroup implements IInvoiceItemGroup {
  title: string;
  count: number;
  amount: number;
  items: any[];

  constructor(title: string, count: number, amount: number, items: any[]) {
    this.title = title;
    this.count = count;
    this.amount = amount;
    this.items = items;
  }
}

export interface IInvoiceAddress {
  name: string;
  epost: string;
  workEpost: string;
  telephone:string;
  address: string;
  city: string;
  postCode: string;
}

export class InvoiceAddress implements IInvoiceAddress {
  name!: string;
  epost!: string;
  workEpost!:string;
  telephone!:string;
  address!: string;
  city!: string;
  postCode!: string;

}

export interface IInvoiceBank{
  name: string;
  customer: string;
  account: string;
  sortCode: string;
}

export class InvoiceBank implements IInvoiceBank{
  name!: string;
  customer!: string;
  account!: string;
  sortCode!: string;
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
  bank!: InvoiceBank
}

export class InvoiceData implements IInvoiceData {
  invoices: Invoice[];
  lastInvoice: number;

  constructor(invoices: Invoice[], lastInvoice: number) {
    this.invoices = invoices;
    this.lastInvoice = lastInvoice;
  }
}