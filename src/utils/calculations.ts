import { Investment, Movement, Referral, WithdrawalRequest } from '../types';

const dayMs = 86400000;

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
  const active = referrals.filter((referral) => referral.status === 'Activo').length;
  return Math.floor(active / 5) * 100;
}

export function paidWithdrawals(withdrawals: WithdrawalRequest[]) {
  return withdrawals.filter((withdrawal) => withdrawal.status === 'Pagado').reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
}

export function reservedWithdrawals(withdrawals: WithdrawalRequest[]) {
  return withdrawals
    .filter((withdrawal) => ['Pendiente', 'Aprobado', 'Pagado'].includes(withdrawal.status))
    .reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
}

export function approvedDeposits(movements: Movement[] = []) {
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
    .filter((movement) => movement.type === 'Bono por referidos' && movement.status === 'Acreditado')
    .reduce((sum, movement) => sum + movement.amount, 0);
}

export function availableBalance(investments: Investment[], withdrawals: WithdrawalRequest[], referrals: Referral[], movements: Movement[] = []) {
  return approvedDeposits(movements) + accruedProfit(investments) + referralBonus(referrals) + creditedRegistrationBonus(movements) + debitedPlanPurchases(movements) - reservedWithdrawals(withdrawals);
}

export function withdrawableBalance(investments: Investment[], withdrawals: WithdrawalRequest[]) {
  return Math.max(0, accruedProfit(investments) - reservedWithdrawals(withdrawals));
}

export function movementAmount(movement: Movement) {
  return movement.amount >= 0 ? `+${movement.amount}` : String(movement.amount);
}
