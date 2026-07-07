import { Investment, Movement, RechargeRequest, Referral, WithdrawalRequest } from '../types';

const dayMs = 86400000;

export const referralCycleBonuses = [
  { active: 5, amount: 100 },
  { active: 15, amount: 250 },
  { active: 30, amount: 500 },
  { active: 45, amount: 650 },
  { active: 60, amount: 800 },
  { active: 80, amount: 1200 },
  { active: 100, amount: 1800 }
];

export function daysSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / dayMs));
}

export function dailyProfitTotal(investments: Investment[]) {
  return investments.filter((investment) => investment.active).reduce((sum, investment) => sum + investment.dailyProfit, 0);
}

export function accruedProfit(investments: Investment[]) {
  return investments
    .filter((investment) => investment.active)
    .reduce((sum, investment) => sum + investment.dailyProfit * daysSince(investment.startedAt), 0);
}

export function referralBonus(referrals: Referral[]) {
  const active = referrals.filter((referral) => (!referral.line || referral.line === 1) && referral.status === 'Activo').length;
  return referralCycleBonuses
    .filter((cycle) => active >= cycle.active)
    .reduce((sum, cycle) => sum + cycle.amount, 0);
}

export function activeDirectReferralCount(referrals: Referral[]) {
  return referrals.filter((referral) => (!referral.line || referral.line === 1) && referral.status === 'Activo').length;
}

export function completedReferralCycles(referrals: Referral[]) {
  const active = activeDirectReferralCount(referrals);
  return referralCycleBonuses.filter((cycle) => active >= cycle.active);
}

export function nextReferralCycle(referrals: Referral[]) {
  const active = activeDirectReferralCount(referrals);
  return referralCycleBonuses.find((cycle) => active < cycle.active);
}

export function paidWithdrawals(withdrawals: WithdrawalRequest[]) {
  return withdrawals.filter((withdrawal) => withdrawal.status === 'Pagado').reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
}

export function reservedWithdrawals(withdrawals: WithdrawalRequest[]) {
  return withdrawals
    .filter((withdrawal) => ['Pendiente', 'Aprobado', 'Pagado'].includes(withdrawal.status))
    .reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
}

export function approvedDeposits(movements: Movement[] = [], recharges: RechargeRequest[] = []) {
  if (recharges.length) {
    return recharges
      .filter((recharge) => recharge.status === 'Aprobada')
      .reduce((sum, recharge) => sum + recharge.amount, 0);
  }
  return movements
    .filter((movement) => movement.type === 'Deposito' && movement.status === 'Aprobada')
    .reduce((sum, movement) => sum + movement.amount, 0);
}

export function debitedPlanPurchases(movements: Movement[] = []) {
  return movements
    .filter((movement) => movement.type === 'Compra de plan' && !movement.status.includes('Rechaz'))
    .reduce((sum, movement) => sum + movement.amount, 0);
}

export function creditedRegistrationBonus(movements: Movement[] = []) {
  return movements
    .filter((movement) => ['Bono de registro', 'Bono de regalo', 'Bono por referidos'].includes(movement.type) && movement.status === 'Acreditado')
    .reduce((sum, movement) => sum + movement.amount, 0);
}

export function creditedReferralLineBonus(movements: Movement[] = []) {
  return movements
    .filter((movement) => movement.type === 'Bono por referidos' && movement.status === 'Acreditado' && movement.id.includes('-line-'))
    .reduce((sum, movement) => sum + movement.amount, 0);
}

export function availableBalance(
  investments: Investment[],
  withdrawals: WithdrawalRequest[],
  referrals: Referral[],
  movements: Movement[] = [],
  recharges: RechargeRequest[] = []
) {
  const balance = approvedDeposits(movements, recharges) + accruedProfit(investments) + creditedRegistrationBonus(movements) + debitedPlanPurchases(movements) - reservedWithdrawals(withdrawals);
  return Math.max(0, balance);
}

export function withdrawableBalance(investments: Investment[], withdrawals: WithdrawalRequest[]) {
  return Math.max(0, accruedProfit(investments) - reservedWithdrawals(withdrawals));
}

export function movementAmount(movement: Movement) {
  return movement.amount >= 0 ? `+${movement.amount}` : String(movement.amount);
}
