export interface IPayload {
  id: string;
  ref: string;
  key: string;
  value: string;
}

export class Payload implements IPayload {
  id!: string;
  ref!: string;
  key!: string;
  value!: string;
}
