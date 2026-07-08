import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { demoState } from '../data/demo';
import { AppState, GiftCode, InvestmentPlan, PaymentAccount, RechargeStatus, User, UserBankAccount, WithdrawalStatus } from '../types';
import { api } from '../utils/api';

interface AppContextValue {
  state: AppState;
  currentUser: User | null;
  loading: boolean;
  error: string;
  login: (phone: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  register: (name: string, phone: string, password: string, referralCode?: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  resetDemo: () => Promise<void>;
  createRecharge: (payload: {
    bankName: string;
    referenceNumber: string;
    amount: number;
    transferDate: string;
    receiptName: string;
    receiptDataUrl?: string;
  }) => Promise<void>;
  purchasePlan: (planId: string) => Promise<void>;
  createWithdrawal: (payload: {
    bank: string;
    accountHolder: string;
    accountNumber: string;
    accountType: string;
    amount: number;
  }) => Promise<void>;
  updateRecharge: (id: string, status: RechargeStatus) => Promise<void>;
  adminCreditBalance: (userId: string, amount: number) => Promise<void>;
  updateWithdrawal: (id: string, status: WithdrawalStatus) => Promise<void>;
  updateUserProfile: (payload: { bankMethods?: UserBankAccount[]; password?: string }) => Promise<void>;
  updateUserPassword: (id: string, password: string) => Promise<void>;
  updateUserBlock: (id: string, blocked: boolean) => Promise<void>;
  updatePaymentAccounts: (paymentAccounts: PaymentAccount[]) => Promise<void>;
  updatePlans: (plans: InvestmentPlan[]) => Promise<void>;
  removeInvestment: (id: string) => Promise<void>;
  updateGiftCodes: (giftCodes: GiftCode[]) => Promise<void>;
  redeemGiftCode: (code: string) => Promise<void>;
  sendChat: (text: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function normalizeClientState(state: AppState): AppState {
  return {
    ...demoState,
    ...state,
    plans: Array.isArray(state.plans) ? state.plans : demoState.plans,
    paymentAccounts: Array.isArray(state.paymentAccounts) ? state.paymentAccounts : demoState.paymentAccounts,
    giftCodes: Array.isArray(state.giftCodes)
      ? state.giftCodes.map((giftCode) => ({ ...giftCode, maxRedemptions: Math.max(1, Number(giftCode.maxRedemptions) || 50) }))
      : demoState.giftCodes,
    users: Array.isArray(state.users) ? state.users.map((user) => ({ ...user, bankMethods: Array.isArray(user.bankMethods) ? user.bankMethods : [], blocked: user.blocked ?? false })) : demoState.users,
    investments: Array.isArray(state.investments) ? state.investments : [],
    recharges: Array.isArray(state.recharges) ? state.recharges : [],
    withdrawals: Array.isArray(state.withdrawals) ? state.withdrawals : [],
    referrals: Array.isArray(state.referrals) ? state.referrals : [],
    movements: Array.isArray(state.movements) ? state.movements : [],
    chat: Array.isArray(state.chat) ? state.chat : demoState.chat
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({ ...demoState, currentUserId: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .state()
      .then((nextState) => setState(normalizeClientState(nextState)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === state.currentUserId) ?? null,
    [state.currentUserId, state.users]
  );

  useEffect(() => {
    if (!state.currentUserId) return;
    const refreshState = () => {
      api
        .state()
        .then((nextState) => setState(normalizeClientState(nextState)))
        .catch(() => {});
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshState();
    };
    const interval = window.setInterval(refreshState, 60000);
    window.addEventListener('focus', refreshState);
    window.addEventListener('pageshow', refreshState);
    window.addEventListener('online', refreshState);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshState);
      window.removeEventListener('pageshow', refreshState);
      window.removeEventListener('online', refreshState);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [state.currentUserId]);

  async function run(action: () => Promise<AppState>) {
    setError('');
    try {
      setState(normalizeClientState(await action()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar con el servidor.');
      throw err;
    }
  }

  const value: AppContextValue = {
    state,
    currentUser,
    loading,
    error,
    async login(phone, password) {
      try {
        await run(() => api.login(phone, password));
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : 'No se pudo iniciar sesion.' };
      }
    },
    async register(name, phone, password, referralCode) {
      try {
        await run(() => api.register(name, phone, password, referralCode));
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : 'No se pudo crear la cuenta.' };
      }
    },
    logout() {
      api.logout();
      setState((prev) => ({ ...prev, currentUserId: null }));
    },
    async resetDemo() {
      await run(api.reset);
    },
    async createRecharge(payload) {
      await run(() => api.createRecharge(payload));
    },
    async purchasePlan(planId) {
      await run(() => api.purchasePlan(planId));
    },
    async createWithdrawal(payload) {
      await run(() => api.createWithdrawal(payload));
    },
    async updateRecharge(id, status) {
      await run(() => api.updateRecharge(id, status));
    },
    async adminCreditBalance(userId, amount) {
      await run(() => api.adminCreditBalance(userId, amount));
    },
    async updateWithdrawal(id, status) {
      await run(() => api.updateWithdrawal(id, status));
    },
    async updateUserProfile(payload) {
      if (!currentUser) return;
      await run(() => api.updateUser(currentUser.id, payload));
    },
    async updateUserPassword(id, password) {
      await run(() => api.updateUser(id, { password }));
    },
    async updateUserBlock(id, blocked) {
      await run(() => api.updateUserBlock(id, blocked));
    },
    async updatePaymentAccounts(paymentAccounts) {
      await run(() => api.updatePaymentAccounts(paymentAccounts));
    },
    async updatePlans(plans) {
      await run(() => api.updatePlans(plans));
    },
    async removeInvestment(id) {
      await run(() => api.removeInvestment(id));
    },
    async updateGiftCodes(giftCodes) {
      await run(() => api.updateGiftCodes(giftCodes));
    },
    async redeemGiftCode(code) {
      await run(() => api.redeemGiftCode(code));
    },
    async sendChat(text) {
      await run(() => api.sendChat(text));
    }
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
