import { AppState, GiftCode, InvestmentPlan, PaymentAccount, RechargeStatus, UserBankAccount, WithdrawalStatus } from '../types';

const baseUrl = import.meta.env.VITE_API_URL || '';
const tokenKey = 'renkar-user-id';

function currentUserId() {
  return localStorage.getItem(tokenKey);
}

function persistToken(state: AppState & { token?: string }) {
  if (state.token || state.currentUserId) {
    localStorage.setItem(tokenKey, state.token || state.currentUserId || '');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = currentUserId();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error de servidor.' }));
    throw new Error(error.message || 'Error de servidor.');
  }
  return response.json();
}

export const api = {
  tokenKey,
  currentUserId,
  async state() {
    const userId = currentUserId();
    return request<AppState>(`/api/state${userId ? `?currentUserId=${userId}` : ''}`);
  },
  async login(phone: string, password: string) {
    const state = await request<AppState & { token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, email: phone, password })
    });
    persistToken(state);
    return state;
  },
  async register(name: string, phone: string, password: string, referralCode?: string) {
    const state = await request<AppState & { token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, email: phone, password, referralCode })
    });
    persistToken(state);
    return state;
  },
  logout() {
    localStorage.removeItem(tokenKey);
  },
  async reset() {
    api.logout();
    return request<AppState>('/api/reset', { method: 'POST', body: JSON.stringify({}) });
  },
  createRecharge(payload: Record<string, unknown>) {
    return request<AppState>('/api/recharges', {
      method: 'POST',
      body: JSON.stringify({ ...payload, currentUserId: currentUserId() })
    });
  },
  purchasePlan(planId: string) {
    return request<AppState>('/api/investments/purchase', {
      method: 'POST',
      body: JSON.stringify({ planId, currentUserId: currentUserId() })
    });
  },
  createWithdrawal(payload: Record<string, unknown>) {
    return request<AppState>('/api/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ ...payload, currentUserId: currentUserId() })
    });
  },
  updateRecharge(id: string, status: RechargeStatus) {
    return request<AppState>(`/api/recharges/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, currentUserId: currentUserId() })
    });
  },
  updateWithdrawal(id: string, status: WithdrawalStatus) {
    return request<AppState>(`/api/withdrawals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, currentUserId: currentUserId() })
    });
  },
  updateUser(id: string, payload: { bankMethods?: UserBankAccount[]; password?: string }) {
    return request<AppState>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...payload, currentUserId: currentUserId() })
    });
  },
  updateUserBlock(id: string, blocked: boolean) {
    return request<AppState>(`/api/admin/users/${id}/block`, {
      method: 'PATCH',
      body: JSON.stringify({ blocked, currentUserId: currentUserId() })
    });
  },
  updatePaymentAccounts(paymentAccounts: PaymentAccount[]) {
    return request<AppState>('/api/admin/payment-accounts', {
      method: 'PATCH',
      body: JSON.stringify({ paymentAccounts, currentUserId: currentUserId() })
    });
  },
  updatePlans(plans: InvestmentPlan[]) {
    return request<AppState>('/api/admin/plans', {
      method: 'PATCH',
      body: JSON.stringify({ plans, currentUserId: currentUserId() })
    });
  },
  updateGiftCodes(giftCodes: GiftCode[]) {
    return request<AppState>('/api/admin/gift-codes', {
      method: 'PATCH',
      body: JSON.stringify({ giftCodes, currentUserId: currentUserId() })
    });
  },
  redeemGiftCode(code: string) {
    return request<AppState>('/api/gift-codes/redeem', {
      method: 'POST',
      body: JSON.stringify({ code, currentUserId: currentUserId() })
    });
  },
  sendChat(text: string) {
    return request<AppState>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ text, currentUserId: currentUserId() })
    });
  }
};
