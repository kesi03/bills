import { AssessmentType } from "../invoice";

export interface IAssessmentRecord {
  id: string;
  customer: string;
  crn: string;
  appointmentDateTime: Date;
  assessor: string;
  method: string;
  assessmentType: string;
  assessmentCentre: string;
  cancelled: boolean;
  funderInvoice: string;
  paid: boolean;
  supplierInvoice: string;
  organisation: string;
  status: string;
  delay: number;
  assessorAmount:number;
  assessorMonth: number;
  assessorAssessmentType:number;
  assessorInvoiceRef: string;
  asessorInvoiced:false;
}

export class AssessmentRecord implements IAssessmentRecord {
  id: string;
  customer: string;
  crn: string;
  appointmentDateTime: Date;
  assessor: string;
  method: string;
  assessmentType: string;
  assessmentCentre: string;
  cancelled: boolean;
  funderInvoice: string;
  paid: boolean;
  supplierInvoice: string;
  organisation: string;
  status: string;
  delay: number;
  assessorAmount!: number;
  assessorMonth!: number;
  assessorAssessmentType!:number;
  assessorInvoiceRef!: string;
  asessorInvoiced!: false;

  constructor(raw: any) {
    this.id = raw["IDs"];
    this.customer = raw["Customer"];
    this.crn = raw["CRN"];
    this.appointmentDateTime = new Date(raw["Appointment Date Time"]);
    this.assessor = raw["Assessor"];
    this.method = raw["Method"];
    this.assessmentType = raw["Assessment Type"];
    this.assessmentCentre = raw["Assessment Centre"];
    this.cancelled = raw["Cancelled"] === "true";
    this.funderInvoice = raw["Funder Invoice"];
    this.paid = raw["Paid"] === "true";
    this.supplierInvoice = raw["Supplier Invoice"];
    this.organisation = raw["Organisation"];
    this.status = raw["Status"];
    this.delay = parseInt(raw["Delay"], 10);
  }
    
}