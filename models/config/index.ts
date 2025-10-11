import { map } from "lodash";
import { AssessmentType, IInvoiceAddress, InvoiceAddress } from "../invoice";

export interface AssessmentConfig {
  address: IInvoiceAddress
  costs: {
    cancelled: number;
    assessment: number;
    review: number;
  };
  "Assessment Type": {
    [key: string]: "assessment" | "review" | string;
  };
  Cancelled: boolean;
}

export class Config implements AssessmentConfig {
  address: IInvoiceAddress;
  costs: {
    cancelled: number;
    assessment: number;
    review: number;
  };
  "Assessment Type": {
    [key: string]: "assessment" | "review" | string;
  };
  Cancelled: boolean;
  

  constructor(data: AssessmentConfig) {
    this.address = data.address;
    this.costs = data.costs;
    this["Assessment Type"] = data["Assessment Type"];
    this.Cancelled = data.Cancelled;
  }

  getCostByType(typeLabel: string): number | undefined {
  const typeKey = typeLabel as keyof typeof this.costs;
  return this.costs[typeKey];
}

getAssessmentStringByType(typeLabel: string,cancelledLabel:boolean){
  const typeKey = (cancelledLabel) ? "cancellation":this["Assessment Type"][typeLabel];
  return typeKey;
}

 getAssessmentTypeByType(typeLabel: string,cancelledLabel:boolean): AssessmentType {
  const typeKey = (cancelledLabel) ? "cancellation":this["Assessment Type"][typeLabel];
  const typeMap: { [key: string]: AssessmentType } = {
    assessment: AssessmentType.ASSESSMENT,
    review: AssessmentType.REVIEW,
    cancellation: AssessmentType.CANCELLATION
  };

  return typeMap[typeKey];
}

  isCancelled(): boolean {
    return this.Cancelled;
  }
}