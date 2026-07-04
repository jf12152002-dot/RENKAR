export type Role = 'user' | 'admin' | 'admin_recharges' | 'admin_withdrawals' | 'supervisor';
export type RechargeStatus = 'Pendiente de validacion' | 'Aprobada' | 'Rechazada';
export type WithdrawalStatus = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Pagado';
export type ReferralStatus = 'Activo' | 'Pendiente';
export type MovementType = 'Deposito' | 'Ganancia diaria' | 'Retiro' | 'Bono por referidos' | 'Bono de registro' | 'Bono de regalo';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  joinedAt: string;
  referralCode: string;
  referredBy?: string;
  bankMethods: string[];
  blocked: boolean;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  amount: number;
  dailyProfit: number;
  roiPercent: number;
  durationDays: number;
}

export interface Investment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  dailyProfit: number;
  durationDays: number;
  startedAt: string;
  active: boolean;
  rechargeId: string;
}

export interface RechargeRequest {
  id: string;
  userId: string;
  planId: string;
  bankName: string;
  referenceNumber: string;
  amount: number;
  transferDate: string;
  receiptName: string;
  receiptDataUrl?: string;
  status: RechargeStatus;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  bank: string;
  accountHolder: string;
  accountNumber: string;
  accountType: string;
  amount: number;
  status: WithdrawalStatus;
  createdAt: string;
}

export interface Referral {
  id: string;
  userId: string;
  name: string;
  registeredAt: string;
  status: ReferralStatus;
  investedAmount: number;
}

export interface Movement {
  id: string;
  userId: string;
  type: MovementType;
  amount: number;
  status: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  from: 'user' | 'support';
  text: string;
  createdAt: string;
}

export interface PaymentAccount {
  id: string;
  bank: string;
  accountHolder: string;
  accountNumber: string;
  accountType: string;
  active: boolean;
}

export interface GiftCode {
  id: string;
  code: string;
  amount: number;
  active: boolean;
  createdAt: string;
  redeemedBy: string[];
}

export interface AppState {
  users: User[];
  currentUserId: string | null;
  plans: InvestmentPlan[];
  paymentAccounts: PaymentAccount[];
  giftCodes: GiftCode[];
  investments: Investment[];
  recharges: RechargeRequest[];
  withdrawals: WithdrawalRequest[];
  referrals: Referral[];
  movements: Movement[];
  chat: ChatMessage[];
}
