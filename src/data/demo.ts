import { AppState } from '../types';
import { plans } from './plans';

const today = new Date();
const daysAgo = (days: number) => new Date(today.getTime() - days * 86400000).toISOString();

export const demoState: AppState = {
  currentUserId: 'user-demo',
  plans,
  users: [
    {
      id: 'user-demo',
      name: 'Maria Alvarez',
      email: '8091234567',
      password: '123456',
      role: 'user',
      joinedAt: daysAgo(16),
      referralCode: 'K7P4XQ9',
      bankMethods: [
        {
          id: 'bank-user-demo-1',
          bank: 'Banco Popular',
          accountHolder: 'Maria Alvarez',
          accountNumber: '8290019182',
          accountType: 'Ahorro'
        },
        {
          id: 'bank-user-demo-2',
          bank: 'Banco Banreservas',
          accountHolder: 'Maria Alvarez',
          accountNumber: '8290014471',
          accountType: 'Corriente'
        }
      ],
      blocked: false
    },
    {
      id: 'admin-demo',
      name: 'Admin RENKAR',
      email: '8090000001',
      password: 'admin123',
      role: 'admin',
      joinedAt: daysAgo(40),
      referralCode: 'R8N2K4A',
      bankMethods: [],
      blocked: false
    },
    {
      id: 'admin-recharges-demo',
      name: 'Admin Recargas',
      email: '8090000002',
      password: 'admin123',
      role: 'admin_recharges',
      joinedAt: daysAgo(20),
      referralCode: 'C5M9Q2R',
      bankMethods: [],
      blocked: false
    },
    {
      id: 'admin-withdrawals-demo',
      name: 'Admin Retiros',
      email: '8090000003',
      password: 'admin123',
      role: 'admin_withdrawals',
      joinedAt: daysAgo(20),
      referralCode: 'T6W3L8S',
      bankMethods: [],
      blocked: false
    },
    {
      id: 'supervisor-demo',
      name: 'Supervisor RENKAR',
      email: '8090000004',
      password: 'admin123',
      role: 'supervisor',
      joinedAt: daysAgo(20),
      referralCode: 'V4Z7P2D',
      bankMethods: [],
      blocked: false
    }
  ],
  paymentAccounts: [
    {
      id: 'pay-bhd',
      bank: 'Banco Múltiple BHD',
      accountHolder: 'RENKAR SRL',
      accountNumber: '80000000001',
      accountType: 'Corriente',
      active: true
    },
    {
      id: 'pay-popular',
      bank: 'Banco Popular',
      accountHolder: 'RENKAR SRL',
      accountNumber: '80000000002',
      accountType: 'Corriente',
      active: true
    },
    {
      id: 'pay-banreservas',
      bank: 'Banco Banreservas',
      accountHolder: 'RENKAR SRL',
      accountNumber: '80000000003',
      accountType: 'Corriente',
      active: true
    }
  ],
  giftCodes: [
    {
      id: 'gift-demo-1',
      code: 'RENKAR200',
      amount: 200,
      active: true,
      createdAt: daysAgo(2),
      redeemedBy: []
    }
  ],
  investments: [
    {
      id: 'inv-1',
      userId: 'user-demo',
      planId: 'plan-renkar-c',
      amount: 3500,
      dailyProfit: 315,
      durationDays: 30,
      startedAt: daysAgo(6),
      active: true
    }
  ],
  recharges: [
    {
      id: 'rec-1',
      userId: 'user-demo',
      bankName: 'Banco Popular',
      referenceNumber: '80000000002',
      amount: 3500,
      transferDate: daysAgo(6).slice(0, 10),
      receiptName: 'comprobante-demo.jpg',
      status: 'Aprobada',
      createdAt: daysAgo(6)
    },
    {
      id: 'rec-2',
      userId: 'user-demo',
      bankName: 'Banreservas',
      referenceNumber: '80000000003',
      amount: 600,
      transferDate: daysAgo(1).slice(0, 10),
      receiptName: 'recarga-pendiente.png',
      status: 'Pendiente de validacion',
      createdAt: daysAgo(1)
    }
  ],
  withdrawals: [
    {
      id: 'with-1',
      userId: 'user-demo',
      bank: 'Banco Popular',
      accountHolder: 'Maria Alvarez',
      accountNumber: '8290019281',
      accountType: 'Ahorro',
      amount: 300,
      status: 'Pagado',
      createdAt: daysAgo(4)
    },
    {
      id: 'with-2',
      userId: 'user-demo',
      bank: 'BHD',
      accountHolder: 'Maria Alvarez',
      accountNumber: '770123008',
      accountType: 'Corriente',
      amount: 200,
      status: 'Pendiente',
      createdAt: daysAgo(1)
    }
  ],
  referrals: [
    { id: 'ref-1', userId: 'user-demo', name: 'Luis Rojas', registeredAt: daysAgo(8), status: 'Activo', investedAmount: 700 },
    { id: 'ref-2', userId: 'user-demo', name: 'Carla Mendez', registeredAt: daysAgo(6), status: 'Activo', investedAmount: 1000 },
    { id: 'ref-3', userId: 'user-demo', name: 'Ramon Ortiz', registeredAt: daysAgo(2), status: 'Activo', investedAmount: 3500 },
    { id: 'ref-4', userId: 'user-demo', name: 'Ana Cruz', registeredAt: daysAgo(1), status: 'Pendiente', investedAmount: 0 }
  ],
  movements: [
    { id: 'mov-registration-demo', userId: 'user-demo', type: 'Bono de registro', amount: 200, status: 'Acreditado', createdAt: daysAgo(16) },
    { id: 'mov-1', userId: 'user-demo', type: 'Deposito', amount: 3500, status: 'Aprobada', createdAt: daysAgo(6) },
    { id: 'mov-purchase-demo', userId: 'user-demo', type: 'Compra de plan', amount: -3500, status: 'Activa', createdAt: daysAgo(6) },
    { id: 'mov-2', userId: 'user-demo', type: 'Ganancia diaria', amount: 150, status: 'Acreditada', createdAt: daysAgo(1) },
    { id: 'mov-3', userId: 'user-demo', type: 'Retiro', amount: -300, status: 'Pagado', createdAt: daysAgo(4) },
    { id: 'mov-4', userId: 'user-demo', type: 'Bono por referidos', amount: 0, status: 'En progreso', createdAt: daysAgo(2) }
  ],
  chat: [
    { id: 'chat-1', from: 'support', text: 'Hola, somos soporte RENKAR. Los pagos se validan manualmente por transferencia bancaria.', createdAt: daysAgo(1) }
  ]
};
