export interface Invoice {
  id?: string;
  clientId: string;
  totalAmount: number;
  paid?: boolean;
  created_at?: string;
  // Additional fields like lineItems could be handled separately.
}