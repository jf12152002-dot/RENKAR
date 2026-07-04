import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import cryptoNode from 'node:crypto';
import * as fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { plans, seedState } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'db.json');
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const port = process.env.PORT || 4000;

loadLocalEnv();

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'renkar-local-dev-secret');
if (isProduction && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET es obligatorio en produccion y debe tener al menos 32 caracteres.');
}

const app = express();
const usePostgres = Boolean(process.env.DATABASE_URL);
if (isProduction && !usePostgres) {
  throw new Error('DATABASE_URL es obligatorio en produccion. No publiques usando local-json.');
}
const pool = usePostgres
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false }
    })
  : null;

const allowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!isProduction || !origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS.'));
  }
}));
app.use(express.json({ limit: '8mb' }));

function loadLocalEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fsSync.existsSync(envPath)) return;
  const lines = fsSync.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(userId) {
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30
  };
  const encoded = `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(JSON.stringify(payload))}`;
  const signature = cryptoNode.createHmac('sha256', jwtSecret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  try {
    if (!token || !token.includes('.')) return null;
    const [header, payload, signature] = token.split('.');
    const expected = cryptoNode.createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
    if (!signature || Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return null;
    if (!cryptoNode.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.sub || null;
  } catch {
    return null;
  }
}

const rateLimitBuckets = new Map();

function rateLimit({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const now = Date.now();
    const bucket = rateLimitBuckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);
    if (bucket.count > max) {
      return res.status(429).json({ message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' });
    }
    next();
  };
}

function hashPassword(password) {
  const salt = cryptoNode.randomBytes(16).toString('hex');
  const hash = cryptoNode.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!String(storedPassword || '').startsWith('scrypt:')) return storedPassword === password;
  const [, salt, hash] = storedPassword.split(':');
  const candidate = cryptoNode.scryptSync(String(password), salt, 64);
  return cryptoNode.timingSafeEqual(Buffer.from(hash, 'hex'), candidate);
}

async function ensureDb() {
  if (pool) {
    await pool.query(`
      create table if not exists users (
        id text primary key,
        name text not null,
        email text not null unique,
        password_hash text not null,
        role text not null,
        joined_at timestamptz not null,
        referral_code text not null unique,
        referred_by text references users(id) on delete set null,
        bank_methods jsonb not null default '[]'::jsonb,
        blocked boolean not null default false
      );
      create table if not exists plans (
        id text primary key,
        name text not null,
        amount numeric not null,
        daily_profit numeric not null,
        roi_percent numeric not null,
        duration_days integer not null
      );
      create table if not exists payment_accounts (
        id text primary key,
        bank text not null,
        account_holder text not null,
        account_number text not null,
        account_type text not null,
        active boolean not null default true
      );
      create table if not exists recharges (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        plan_id text not null,
        bank_name text not null,
        reference_number text,
        amount numeric not null,
        transfer_date text not null,
        receipt_name text,
        receipt_data_url text,
        status text not null,
        created_at timestamptz not null
      );
      create table if not exists investments (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        plan_id text not null,
        amount numeric not null,
        daily_profit numeric not null,
        duration_days integer not null,
        started_at timestamptz not null,
        active boolean not null default true,
        recharge_id text not null
      );
      create table if not exists withdrawals (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        bank text not null,
        account_holder text not null,
        account_number text not null,
        account_type text not null,
        amount numeric not null,
        status text not null,
        created_at timestamptz not null
      );
      create table if not exists referrals (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        name text not null,
        registered_at timestamptz not null,
        status text not null,
        invested_amount numeric not null default 0
      );
      create table if not exists movements (
        id text primary key,
        user_id text not null references users(id) on delete cascade,
        type text not null,
        amount numeric not null,
        status text not null,
        created_at timestamptz not null
      );
      create table if not exists gift_codes (
        id text primary key,
        code text not null unique,
        amount numeric not null,
        active boolean not null default true,
        created_at timestamptz not null
      );
      create table if not exists gift_redemptions (
        gift_code_id text not null references gift_codes(id) on delete cascade,
        user_id text not null references users(id) on delete cascade,
        redeemed_at timestamptz not null default now(),
        primary key (gift_code_id, user_id)
      );
      create table if not exists support_messages (
        id text primary key,
        user_id text references users(id) on delete cascade,
        sender text not null,
        text text not null,
        created_at timestamptz not null
      );
      create table if not exists admin_logs (
        id text primary key,
        admin_user_id text references users(id) on delete set null,
        action text not null,
        entity_type text not null,
        entity_id text,
        metadata jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now()
      );
      create index if not exists idx_users_email on users(email);
      create index if not exists idx_recharges_status_created on recharges(status, created_at desc);
      create index if not exists idx_recharges_user on recharges(user_id);
      create index if not exists idx_withdrawals_status_created on withdrawals(status, created_at desc);
      create index if not exists idx_withdrawals_user_created on withdrawals(user_id, created_at desc);
      create index if not exists idx_movements_user_created on movements(user_id, created_at desc);
      create index if not exists idx_investments_user on investments(user_id);
      create index if not exists idx_referrals_user on referrals(user_id);
      create index if not exists idx_gift_codes_code on gift_codes(code);
      create index if not exists idx_support_user_created on support_messages(user_id, created_at desc);
    `);
    const count = await pool.query('select count(*)::int as count from users');
    if (count.rows[0].count === 0) await persistStateToPostgres(seedState);
    return;
  }
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(seedState, null, 2));
  }
}

async function readDb(currentUserId = null) {
  await ensureDb();
  if (pool) {
    return normalizeState({ ...(await loadStateFromPostgres()), currentUserId });
  }
  const raw = await fs.readFile(dbPath, 'utf8');
  return normalizeState({ ...JSON.parse(raw), currentUserId });
}

async function writeDb(state, currentUserId = null) {
  const stored = { ...state, currentUserId: null };
  if (pool) {
    await ensureDb();
    await persistStateToPostgres(stored);
    return { ...stored, currentUserId };
  }
  await fs.writeFile(dbPath, JSON.stringify(stored, null, 2));
  return { ...stored, currentUserId };
}

async function loadStateFromPostgres() {
  const [
    users,
    plansRows,
    paymentAccounts,
    recharges,
    investments,
    withdrawals,
    referrals,
    movements,
    giftCodes,
    giftRedemptions,
    supportMessages
  ] = await Promise.all([
    pool.query('select * from users order by joined_at asc'),
    pool.query('select * from plans order by amount asc'),
    pool.query('select * from payment_accounts order by bank asc'),
    pool.query('select * from recharges order by created_at desc'),
    pool.query('select * from investments order by started_at desc'),
    pool.query('select * from withdrawals order by created_at desc'),
    pool.query('select * from referrals order by registered_at desc'),
    pool.query('select * from movements order by created_at desc'),
    pool.query('select * from gift_codes order by created_at desc'),
    pool.query('select * from gift_redemptions'),
    pool.query('select * from support_messages order by created_at asc')
  ]);
  const redemptionsByCode = giftRedemptions.rows.reduce((map, row) => {
    map[row.gift_code_id] = [...(map[row.gift_code_id] || []), row.user_id];
    return map;
  }, {});
  return {
    ...seedState,
    currentUserId: null,
    users: users.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      joinedAt: row.joined_at.toISOString(),
      referralCode: row.referral_code,
      referredBy: row.referred_by || undefined,
      bankMethods: row.bank_methods || [],
      blocked: row.blocked
    })),
    plans: plansRows.rows.map((row) => ({
      id: row.id,
      name: row.name,
      amount: Number(row.amount),
      dailyProfit: Number(row.daily_profit),
      roiPercent: Number(row.roi_percent),
      durationDays: Number(row.duration_days)
    })),
    paymentAccounts: paymentAccounts.rows.map((row) => ({
      id: row.id,
      bank: row.bank,
      accountHolder: row.account_holder,
      accountNumber: row.account_number,
      accountType: row.account_type,
      active: row.active
    })),
    recharges: recharges.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id,
      bankName: row.bank_name,
      referenceNumber: row.reference_number || '',
      amount: Number(row.amount),
      transferDate: row.transfer_date,
      receiptName: row.receipt_name || '',
      receiptDataUrl: row.receipt_data_url || undefined,
      status: row.status,
      createdAt: row.created_at.toISOString()
    })),
    investments: investments.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id,
      amount: Number(row.amount),
      dailyProfit: Number(row.daily_profit),
      durationDays: Number(row.duration_days),
      startedAt: row.started_at.toISOString(),
      active: row.active,
      rechargeId: row.recharge_id
    })),
    withdrawals: withdrawals.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      bank: row.bank,
      accountHolder: row.account_holder,
      accountNumber: row.account_number,
      accountType: row.account_type,
      amount: Number(row.amount),
      status: row.status,
      createdAt: row.created_at.toISOString()
    })),
    referrals: referrals.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      registeredAt: row.registered_at.toISOString(),
      status: row.status,
      investedAmount: Number(row.invested_amount)
    })),
    movements: movements.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      amount: Number(row.amount),
      status: row.status,
      createdAt: row.created_at.toISOString()
    })),
    giftCodes: giftCodes.rows.map((row) => ({
      id: row.id,
      code: row.code,
      amount: Number(row.amount),
      active: row.active,
      createdAt: row.created_at.toISOString(),
      redeemedBy: redemptionsByCode[row.id] || []
    })),
    chat: supportMessages.rows.map((row) => ({
      id: row.id,
      from: row.sender === 'admin' ? 'support' : row.sender,
      text: row.text,
      createdAt: row.created_at.toISOString()
    }))
  };
}

async function persistStateToPostgres(state) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(735527)');
    await client.query('delete from support_messages');
    await client.query('delete from gift_redemptions');
    await client.query('delete from gift_codes');
    await client.query('delete from movements');
    await client.query('delete from referrals');
    await client.query('delete from withdrawals');
    await client.query('delete from investments');
    await client.query('delete from recharges');
    await client.query('delete from payment_accounts');
    await client.query('delete from plans');
    await client.query('delete from users');

    for (const user of state.users || []) {
      const passwordHash = String(user.password || '').startsWith('scrypt:') ? user.password : hashPassword(user.password || '123456');
      await client.query(
        `insert into users (id, name, email, password_hash, role, joined_at, referral_code, referred_by, bank_methods, blocked)
         values ($1,$2,$3,$4,$5,$6,$7,null,$8::jsonb,$9)`,
        [user.id, user.name, user.email, passwordHash, user.role, user.joinedAt, user.referralCode, JSON.stringify(user.bankMethods || []), Boolean(user.blocked)]
      );
    }
    for (const user of state.users || []) {
      if (user.referredBy) await client.query('update users set referred_by = $1 where id = $2', [user.referredBy, user.id]);
    }
    for (const plan of state.plans || []) {
      await client.query(
        `insert into plans (id, name, amount, daily_profit, roi_percent, duration_days) values ($1,$2,$3,$4,$5,$6)`,
        [plan.id, plan.name, plan.amount, plan.dailyProfit, plan.roiPercent, plan.durationDays]
      );
    }
    for (const account of state.paymentAccounts || []) {
      await client.query(
        `insert into payment_accounts (id, bank, account_holder, account_number, account_type, active) values ($1,$2,$3,$4,$5,$6)`,
        [account.id, account.bank, account.accountHolder, account.accountNumber, account.accountType, Boolean(account.active)]
      );
    }
    for (const recharge of state.recharges || []) {
      await client.query(
        `insert into recharges (id, user_id, plan_id, bank_name, reference_number, amount, transfer_date, receipt_name, receipt_data_url, status, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [recharge.id, recharge.userId, recharge.planId, recharge.bankName, recharge.referenceNumber, recharge.amount, recharge.transferDate, recharge.receiptName, recharge.receiptDataUrl || null, recharge.status, recharge.createdAt]
      );
    }
    for (const investment of state.investments || []) {
      await client.query(
        `insert into investments (id, user_id, plan_id, amount, daily_profit, duration_days, started_at, active, recharge_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [investment.id, investment.userId, investment.planId, investment.amount, investment.dailyProfit, investment.durationDays, investment.startedAt, Boolean(investment.active), investment.rechargeId]
      );
    }
    for (const withdrawal of state.withdrawals || []) {
      await client.query(
        `insert into withdrawals (id, user_id, bank, account_holder, account_number, account_type, amount, status, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [withdrawal.id, withdrawal.userId, withdrawal.bank, withdrawal.accountHolder, withdrawal.accountNumber, withdrawal.accountType, withdrawal.amount, withdrawal.status, withdrawal.createdAt]
      );
    }
    for (const referral of state.referrals || []) {
      await client.query(
        `insert into referrals (id, user_id, name, registered_at, status, invested_amount) values ($1,$2,$3,$4,$5,$6)`,
        [referral.id, referral.userId, referral.name, referral.registeredAt, referral.status, referral.investedAmount]
      );
    }
    for (const movement of state.movements || []) {
      await client.query(
        `insert into movements (id, user_id, type, amount, status, created_at) values ($1,$2,$3,$4,$5,$6)`,
        [movement.id, movement.userId, movement.type, movement.amount, movement.status, movement.createdAt]
      );
    }
    for (const giftCode of state.giftCodes || []) {
      await client.query(
        `insert into gift_codes (id, code, amount, active, created_at) values ($1,$2,$3,$4,$5)`,
        [giftCode.id, giftCode.code, giftCode.amount, Boolean(giftCode.active), giftCode.createdAt]
      );
      for (const userId of giftCode.redeemedBy || []) {
        await client.query(
          `insert into gift_redemptions (gift_code_id, user_id) values ($1,$2) on conflict do nothing`,
          [giftCode.id, userId]
        );
      }
    }
    for (const message of state.chat || []) {
      await client.query(
        `insert into support_messages (id, user_id, sender, text, created_at) values ($1,$2,$3,$4,$5)`,
        [message.id, message.userId || null, message.from === 'support' ? 'admin' : message.from, message.text, message.createdAt]
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

function clientId(req) {
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return verifyToken(bearer);
}

function requireAdminUser(state, currentUserId, res) {
  const user = requireActiveUser(state, currentUserId, res);
  if (!user) return null;
  if (!canManageSystem(user)) {
    res.status(403).json({ message: 'Solo administracion principal puede realizar esta accion.' });
    return null;
  }
  return user;
}

function requireActiveUser(state, currentUserId, res) {
  if (!currentUserId) {
    res.status(401).json({ message: 'Sesion requerida.' });
    return null;
  }
  const user = state.users.find((item) => item.id === currentUserId);
  if (!user) {
    res.status(401).json({ message: 'Sesion requerida.' });
    return null;
  }
  if (user.blocked) {
    res.status(403).json({ message: 'Tu cuenta esta bloqueada. Contacta a administracion.' });
    return null;
  }
  return user;
}

function hasRole(user, roles) {
  return user && roles.includes(user.role);
}

function canManageRecharges(user) {
  return hasRole(user, ['admin', 'admin_recharges', 'supervisor']);
}

function canManageWithdrawals(user) {
  return hasRole(user, ['admin', 'admin_withdrawals', 'supervisor']);
}

function canManageSystem(user) {
  return hasRole(user, ['admin', 'supervisor']);
}

function clientState(state, currentUserId, extra = {}) {
  const currentUser = state.users.find((user) => user.id === currentUserId);
  const isAdmin = ['admin', 'admin_recharges', 'admin_withdrawals', 'supervisor'].includes(currentUser?.role);
  if (!currentUserId) {
    return {
      ...state,
      currentUserId: null,
      users: [],
      recharges: [],
      withdrawals: [],
      investments: [],
      referrals: [],
      movements: [],
      giftCodes: [],
      paymentAccounts: [],
      chat: [],
      ...extra
    };
  }
  if (isAdmin) return { ...state, currentUserId, ...extra };
  return {
    ...state,
    currentUserId,
    users: currentUser ? [currentUser] : [],
    recharges: state.recharges.filter((item) => item.userId === currentUserId),
    withdrawals: state.withdrawals.filter((item) => item.userId === currentUserId),
    investments: state.investments.filter((item) => item.userId === currentUserId),
    referrals: state.referrals.filter((item) => item.userId === currentUserId),
    movements: state.movements.filter((item) => item.userId === currentUserId),
    giftCodes: [],
    chat: state.chat.filter((item) => !item.userId || item.userId === currentUserId),
    ...extra
  };
}

function normalizeState(state) {
  const users = Array.isArray(state.users) ? state.users : seedState.users;
  const mergedUsers = [
    ...users,
    ...seedState.users.filter((seedUser) => seedUser.role !== 'user' && !users.some((user) => user.id === seedUser.id))
  ];
  const normalizedPlans = Array.isArray(state.plans) ? state.plans : seedState.plans;
  const paymentAccounts = Array.isArray(state.paymentAccounts) ? state.paymentAccounts : seedState.paymentAccounts;
  const giftCodes = Array.isArray(state.giftCodes) ? state.giftCodes : seedState.giftCodes;
  const movements = Array.isArray(state.movements) ? state.movements : seedState.movements;
  const registrationBonuses = mergedUsers
    .filter((user) => user.role === 'user')
    .filter((user) => !movements.some((movement) => movement.userId === user.id && movement.type === 'Bono de registro'))
    .map((user) => ({
      id: `mov-registration-${user.id}`,
      userId: user.id,
      type: 'Bono de registro',
      amount: 200,
      status: 'Acreditado',
      createdAt: user.joinedAt || new Date().toISOString()
    }));
  const legacyNumbers = new Set(['001-000000-1', '777-000000-2', '960-000000-3', '']);
  return {
    ...seedState,
    ...state,
    movements: [...registrationBonuses, ...movements],
    giftCodes: giftCodes.map((giftCode) => ({
      id: String(giftCode.id || uid('gift')),
      code: String(giftCode.code || '').trim().toUpperCase(),
      amount: Number(giftCode.amount) || 0,
      active: giftCode.active !== false,
      createdAt: giftCode.createdAt || new Date().toISOString(),
      redeemedBy: Array.isArray(giftCode.redeemedBy) ? giftCode.redeemedBy : []
    })).filter((giftCode) => giftCode.code && giftCode.amount > 0),
    plans: normalizedPlans.map((plan) => ({
      id: String(plan.id || uid('plan')),
      name: String(plan.name || 'RENKAR').trim(),
      amount: Number(plan.amount) || 0,
      roiPercent: Number(plan.roiPercent) || 0,
      dailyProfit: Number(plan.dailyProfit) || Math.round((Number(plan.amount) || 0) * (Number(plan.roiPercent) || 0) / 100),
      durationDays: Number(plan.durationDays) || 30
    })).filter((plan) => plan.id && plan.name && plan.amount > 0),
    users: mergedUsers.map((user) => ({ blocked: false, ...user })),
    paymentAccounts: paymentAccounts.map((account) => ({
      ...account,
      bank: account.bank === 'Banco Multiple BHD' ? 'Banco Múltiple BHD' : account.bank,
      accountNumber: legacyNumbers.has(account.accountNumber)
        ? seedState.paymentAccounts.find((seed) => seed.bank === (account.bank === 'Banco Multiple BHD' ? 'Banco Múltiple BHD' : account.bank))?.accountNumber || account.accountNumber
        : account.accountNumber
    }))
  };
}

function formatMoney(value) {
  return `RD$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;
}

const allowedVoucherMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxVoucherBytes = Number(process.env.MAX_VOUCHER_MB || 5) * 1024 * 1024;

function parseVoucherDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('El comprobante debe ser una imagen valida JPG, PNG o WEBP.');
  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  if (!allowedVoucherMimeTypes.has(mimeType)) throw new Error('Formato de comprobante no permitido.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > maxVoucherBytes) {
    throw new Error(`El comprobante debe pesar menos de ${Math.round(maxVoucherBytes / 1024 / 1024)}MB.`);
  }
  return { mimeType, buffer };
}

function dataUrlToBlob(dataUrl) {
  try {
    const { mimeType, buffer } = parseVoucherDataUrl(dataUrl);
    return new Blob([buffer], { type: mimeType });
  } catch {
    return null;
  }
}

async function storeVoucherFile(recharge) {
  const { mimeType, buffer } = parseVoucherDataUrl(recharge.receiptDataUrl);
  const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const folder = path.join(uploadsDir, 'vouchers');
  await fs.mkdir(folder, { recursive: true });
  const filename = `${recharge.id}.${extension}`;
  await fs.writeFile(path.join(folder, filename), buffer);
  return {
    ...recharge,
    receiptDataUrl: `/uploads/vouchers/${filename}`
  };
}

function cleanText(value, max = 120) {
  return String(value || '').trim().slice(0, max);
}

function normalizeEmail(value) {
  return cleanText(value, 180).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value) {
  return cleanText(value, 40).replace(/\D/g, '');
}

function isValidPhone(value) {
  return /^\d{7,15}$/.test(value);
}

const legacyLoginAliases = {
  '8091234567': 'demo@renkar.app',
  '8090000001': 'admin@renkar.app',
  '8090000002': 'recargas@renkar.app',
  '8090000003': 'retiros@renkar.app',
  '8090000004': 'supervisor@renkar.app'
};

function uniqueReferralCode(state, name) {
  const base = cleanText(name, 40).split(/\s+/)[0]?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'USER';
  for (let i = 0; i < 20; i += 1) {
    const code = `${base}${Math.floor(Math.random() * 900 + 100)}`;
    if (!state.users.some((user) => user.referralCode.toLowerCase() === code.toLowerCase())) return code;
  }
  return `${base}${cryptoNode.randomBytes(3).toString('hex').toUpperCase()}`;
}

function activePaymentAccountByNumber(state, accountNumber) {
  return (state.paymentAccounts || []).find((account) => account.active && account.accountNumber === accountNumber);
}

function dominicanDateParts() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value || '';
  return {
    weekday: value('weekday'),
    minutes: Number(value('hour')) * 60 + Number(value('minute'))
  };
}

function isWithinSchedule(startHour, endHour, { mondayToSaturday = false } = {}) {
  const { weekday, minutes } = dominicanDateParts();
  if (mondayToSaturday && weekday === 'Sun') return false;
  return minutes >= startHour * 60 && minutes <= endHour * 60;
}

function dominicanDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function ensureSchedule(res, allowed, message) {
  if (allowed) return true;
  res.status(403).json({ message });
  return false;
}

function daysSince(date) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
}

function availableBalanceForUser(state, userId) {
  const investments = state.investments.filter((item) => item.userId === userId && item.active);
  const withdrawals = state.withdrawals.filter((item) => item.userId === userId);
  const referrals = state.referrals.filter((item) => item.userId === userId);
  const movements = state.movements.filter((item) => item.userId === userId);
  const accrued = investments.reduce((sum, item) => sum + Number(item.dailyProfit) * daysSince(item.startedAt), 0);
  const activeReferrals = referrals.filter((item) => item.status === 'Activo').length;
  const referralBonus = Math.floor(activeReferrals / 5) * 100;
  const creditedBonuses = movements
    .filter((item) => ['Bono de registro', 'Bono de regalo', 'Bono por referidos'].includes(item.type) && item.status === 'Acreditado')
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const paidOrPendingWithdrawals = withdrawals
    .filter((item) => ['Pendiente', 'Aprobado', 'Pagado'].includes(item.status))
    .reduce((sum, item) => sum + Number(item.amount), 0);
  return accrued + referralBonus + creditedBonuses - paidOrPendingWithdrawals;
}

async function logAdminAction(state, adminUserId, action, entityType, entityId, metadata = {}) {
  if (!pool) return;
  await pool.query(
    `insert into admin_logs (id, admin_user_id, action, entity_type, entity_id, metadata)
     values ($1,$2,$3,$4,$5,$6::jsonb)`,
    [uid('log'), adminUserId, action, entityType, entityId, JSON.stringify(metadata)]
  );
}

async function writeJsonBackup() {
  if (process.env.ENABLE_JSON_BACKUPS !== 'true') return;
  const backupDir = path.join(__dirname, 'backups');
  await fs.mkdir(backupDir, { recursive: true });
  const state = await readDb();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.writeFile(path.join(backupDir, `renkar-${stamp}.json`), JSON.stringify({ ...state, currentUserId: null }, null, 2));
}

function createMultilevelReferralBonuses(state, activatedUser, plan, rechargeId) {
  const lines = [
    { level: 1, percent: 15 },
    { level: 2, percent: 3 },
    { level: 3, percent: 2 }
  ];
  let currentUser = activatedUser;
  for (const line of lines) {
    if (!currentUser?.referredBy) break;
    const sponsor = state.users.find((user) => user.id === currentUser.referredBy);
    if (!sponsor) break;
    const movementId = `mov-ref-${rechargeId}-line-${line.level}`;
    if (!state.movements.some((movement) => movement.id === movementId)) {
      state.movements.unshift({
        id: movementId,
        userId: sponsor.id,
        type: 'Bono por referidos',
        amount: Math.round(Number(plan.amount) * line.percent / 100),
        status: 'Acreditado',
        createdAt: new Date().toISOString()
      });
    }
    currentUser = sponsor;
  }
}

async function sendTelegramRechargeNotification({ recharge, user }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const caption = [
    'Nueva solicitud de recarga',
    '',
    `Usuario: ${user.name}`,
    `Telefono: ${user.email}`,
    `Monto: ${formatMoney(recharge.amount)}`,
    `Banco: ${recharge.bankName}`,
    `Cuenta: ${recharge.referenceNumber || 'No especificada'}`,
    `Fecha: ${recharge.transferDate}`,
    `Estado: ${recharge.status}`
  ].join('\n');

  const photo = dataUrlToBlob(recharge.receiptDataUrl);
  if (photo) {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('photo', photo, recharge.receiptName || 'voucher.jpg');
    const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form
    });
    if (!response.ok) throw new Error(`Telegram sendPhoto failed: ${response.status} ${await response.text()}`);
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: `${caption}\n\nVoucher: ${recharge.receiptName || 'No adjunto'}` })
  });
  if (!response.ok) throw new Error(`Telegram sendMessage failed: ${response.status} ${await response.text()}`);
}

async function sendTelegramWithdrawalNotification({ withdrawal, user }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_WITHDRAWALS_CHAT_ID;
  if (!token || !chatId) return;

  const text = [
    'Nueva solicitud de retiro',
    '',
    `Usuario: ${user.name}`,
    `Telefono: ${user.email}`,
    `Monto: ${formatMoney(withdrawal.amount)}`,
    `Banco: ${withdrawal.bank}`,
    `Titular: ${withdrawal.accountHolder}`,
    `Cuenta: ${withdrawal.accountNumber}`,
    `Tipo de cuenta: ${withdrawal.accountType}`,
    `Estado: ${withdrawal.status}`
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  if (!response.ok) throw new Error(`Telegram withdrawal sendMessage failed: ${response.status} ${await response.text()}`);
}

async function sendTelegramTestMessage() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en .env');
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: 'Prueba RENKAR: Telegram esta conectado correctamente.'
    })
  });
  if (!response.ok) throw new Error(`Telegram test failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function sendTelegramWithdrawalsTestMessage() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_WITHDRAWALS_CHAT_ID;
  if (!token || !chatId) {
    throw new Error('Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_WITHDRAWALS_CHAT_ID en .env');
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: 'Prueba RENKAR: notificaciones de retiros conectadas correctamente.'
    })
  });
  if (!response.ok) throw new Error(`Telegram withdrawals test failed: ${response.status} ${await response.text()}`);
  return response.json();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'RENKAR API', storage: usePostgres ? 'postgres' : 'local-json' });
});

app.post('/api/telegram/test', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  const currentUser = state.users.find((user) => user.id === currentUserId);
  if (!canManageSystem(currentUser)) {
    return res.status(403).json({ message: 'Solo administracion puede probar Telegram.' });
  }
  try {
    const result = await sendTelegramTestMessage();
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'No se pudo enviar a Telegram.' });
  }
});

app.post('/api/telegram/test-withdrawals', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  const currentUser = state.users.find((user) => user.id === currentUserId);
  if (!canManageSystem(currentUser)) {
    return res.status(403).json({ message: 'Solo administracion puede probar Telegram.' });
  }
  try {
    const result = await sendTelegramWithdrawalsTestMessage();
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'No se pudo enviar a Telegram.' });
  }
});

app.get('/api/state', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb(currentUserId);
  const currentUser = state.users.find((user) => user.id === currentUserId);
  res.json(clientState(state, currentUser?.blocked ? null : state.currentUserId));
});

app.post('/api/reset', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  if (!requireAdminUser(state, currentUserId, res)) return;
  if (process.env.ALLOW_PRODUCTION_RESET !== 'true') {
    return res.status(403).json({ message: 'Reset deshabilitado en produccion.' });
  }
  if (usePostgres) {
    res.json(clientState(await writeDb(seedState, null), null));
    return;
  }
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(seedState, null, 2));
  res.json({ ...seedState, currentUserId: null });
});

app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'login' }), async (req, res) => {
  const state = await readDb();
  const phone = normalizePhone(req.body.phone || req.body.email);
  const legacyEmail = normalizeEmail(req.body.email || req.body.phone);
  const password = String(req.body.password || '');
  const legacyAlias = legacyLoginAliases[phone];
  const user = state.users.find((item) =>
    normalizePhone(item.email) === phone || item.email.toLowerCase() === legacyEmail || item.email.toLowerCase() === legacyAlias
  );
  if (!user || !password || !verifyPassword(password, user.password)) return res.status(401).json({ message: 'Credenciales incorrectas.' });
  if (!String(user.password || '').startsWith('scrypt:')) {
    user.password = hashPassword(password);
    await writeDb(state, user.id);
  }
  if (user.blocked) return res.status(403).json({ message: 'Tu cuenta esta bloqueada. Contacta a administracion.' });
  res.json(clientState(await readDb(user.id), user.id, { token: signToken(user.id) }));
});

app.post('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: 'register' }), async (req, res) => {
  const state = await readDb();
  const name = cleanText(req.body.name, 80);
  const phone = normalizePhone(req.body.phone || req.body.email);
  const password = String(req.body.password || '');
  const referralCode = cleanText(req.body.referralCode, 30);
  if (name.length < 2) return res.status(400).json({ message: 'Escribe tu nombre completo.' });
  if (!isValidPhone(phone)) return res.status(400).json({ message: 'Escribe un numero de telefono valido.' });
  if (password.length < 6) return res.status(400).json({ message: 'La clave debe tener al menos 6 caracteres.' });
  if (state.users.some((user) => normalizePhone(user.email) === phone)) {
    return res.status(409).json({ message: 'Ese numero de telefono ya existe.' });
  }
  const referredBy = state.users.find((user) => user.referralCode.toLowerCase() === String(referralCode || '').toLowerCase());
  const user = {
    id: uid('user'),
    name,
    email: phone,
    password: hashPassword(password),
    role: 'user',
    joinedAt: new Date().toISOString(),
    referralCode: uniqueReferralCode(state, name),
    referredBy: referredBy?.id,
    bankMethods: [],
    blocked: false
  };
  state.users.push(user);
  state.movements.unshift({
    id: uid('mov'),
    userId: user.id,
    type: 'Bono de registro',
    amount: 200,
    status: 'Acreditado',
    createdAt: new Date().toISOString()
  });
  if (referredBy) {
    state.referrals.push({
      id: uid('ref'),
      userId: referredBy.id,
      name,
      registeredAt: new Date().toISOString(),
      status: 'Pendiente',
      investedAmount: 0
    });
  }
  res.json(clientState(await writeDb(state, user.id), user.id, { token: signToken(user.id) }));
});

app.post('/api/recharges', rateLimit({ windowMs: 60 * 60 * 1000, max: 12, keyPrefix: 'recharges' }), async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  const user = requireActiveUser(state, currentUserId, res);
  if (!user) return;
  if (!ensureSchedule(res, isWithinSchedule(9, 19), 'El horario para invertir es de 9:00 AM a 7:00 PM.')) return;
  const plan = state.plans.find((item) => item.id === req.body.planId);
  if (!plan) return res.status(400).json({ message: 'Selecciona un plan de inversion valido.' });
  const paymentAccount = activePaymentAccountByNumber(state, req.body.referenceNumber);
  if (!paymentAccount) return res.status(400).json({ message: 'Selecciona una cuenta bancaria activa de RENKAR.' });
  if (!req.body.receiptDataUrl) return res.status(400).json({ message: 'Debes subir el comprobante de pago.' });
  try {
    parseVoucherDataUrl(req.body.receiptDataUrl);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  const recharge = {
    id: uid('rec'),
    userId: currentUserId,
    planId: plan.id,
    bankName: paymentAccount.bank,
    referenceNumber: paymentAccount.accountNumber,
    amount: Number(plan.amount),
    transferDate: cleanText(req.body.transferDate, 20),
    receiptName: cleanText(req.body.receiptName || 'comprobante.jpg', 160),
    receiptDataUrl: req.body.receiptDataUrl,
    status: 'Pendiente de validacion',
    createdAt: new Date().toISOString()
  };
  const telegramReceiptDataUrl = recharge.receiptDataUrl;
  const storedRecharge = await storeVoucherFile(recharge);
  state.recharges.unshift(storedRecharge);
  state.movements.unshift({
    id: `mov-${storedRecharge.id}`,
    userId: currentUserId,
    type: 'Deposito',
    amount: Number(storedRecharge.amount),
    status: 'Pendiente de validacion',
    createdAt: new Date().toISOString()
  });
  const nextState = await writeDb(state, currentUserId);
  sendTelegramRechargeNotification({ recharge: { ...storedRecharge, receiptDataUrl: telegramReceiptDataUrl || storedRecharge.receiptDataUrl }, user }).catch((error) => {
    console.error('Telegram recharge notification error:', error.message);
  });
  res.json(clientState(nextState, currentUserId));
});

app.post('/api/withdrawals', rateLimit({ windowMs: 60 * 60 * 1000, max: 8, keyPrefix: 'withdrawals' }), async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  const user = requireActiveUser(state, currentUserId, res);
  if (!user) return;
  if (!ensureSchedule(res, isWithinSchedule(10, 17, { mondayToSaturday: true }), 'Los retiros estan disponibles de lunes a sabado de 10:00 AM a 5:00 PM.')) return;
  const hasApprovedRecharge = state.recharges.some((item) => item.userId === currentUserId && item.status === 'Aprobada');
  if (!hasApprovedRecharge) {
    return res.status(403).json({
      message: 'Para retirar debes tener al menos una recarga aprobada por administracion. Los bonos, comisiones o referidos no habilitan retiros por si solos.'
    });
  }
  const todayKey = dominicanDateKey(new Date());
  const hasWithdrawalToday = state.withdrawals.some((item) => item.userId === currentUserId && dominicanDateKey(new Date(item.createdAt)) === todayKey);
  if (hasWithdrawalToday) {
    return res.status(403).json({
      message: 'Ya solicitaste un retiro hoy. Debes esperar hasta manana para solicitar otro retiro.'
    });
  }
  const requestedAmount = Number(req.body.amount);
  const availableBalance = availableBalanceForUser(state, currentUserId);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > availableBalance) {
    return res.status(400).json({
      message: `Monto invalido. Tu saldo disponible para retirar es ${formatMoney(availableBalance)}.`
    });
  }
  const withdrawal = {
    id: uid('with'),
    userId: currentUserId,
    bank: cleanText(req.body.bank, 80),
    accountHolder: cleanText(req.body.accountHolder, 120),
    accountNumber: cleanText(req.body.accountNumber, 60),
    accountType: cleanText(req.body.accountType, 40),
    amount: requestedAmount,
    status: 'Pendiente',
    createdAt: new Date().toISOString()
  };
  if (!withdrawal.bank || !withdrawal.accountHolder || !withdrawal.accountNumber || !withdrawal.accountType) {
    return res.status(400).json({ message: 'Completa todos los datos bancarios para retirar.' });
  }
  state.withdrawals.unshift(withdrawal);
  state.movements.unshift({
    id: uid('mov'),
    userId: currentUserId,
    type: 'Retiro',
    amount: -withdrawal.amount,
    status: 'Pendiente',
    createdAt: new Date().toISOString()
  });
  const nextState = await writeDb(state, currentUserId);
  sendTelegramWithdrawalNotification({ withdrawal, user }).catch((error) => {
    console.error('Telegram withdrawal notification error:', error.message);
  });
  res.json(clientState(nextState, currentUserId));
});

app.post('/api/gift-codes/redeem', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  const user = requireActiveUser(state, currentUserId, res);
  if (!user) return;
  const code = String(req.body.code || '').trim().toUpperCase();
  const giftCode = state.giftCodes.find((item) => item.code === code);
  if (!giftCode || !giftCode.active) {
    return res.status(404).json({ message: 'Este codigo no existe o no esta disponible.' });
  }
  if (giftCode.redeemedBy.includes(currentUserId)) {
    return res.status(409).json({ message: 'Ya canjeaste este codigo anteriormente.' });
  }
  giftCode.redeemedBy.push(currentUserId);
  state.movements.unshift({
    id: uid('mov'),
    userId: currentUserId,
    type: 'Bono de regalo',
    amount: Number(giftCode.amount),
    status: 'Acreditado',
    createdAt: new Date().toISOString()
  });
  const nextState = await writeDb(state, currentUserId);
  res.json(clientState(nextState, currentUserId));
});

app.patch('/api/recharges/:id', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  const currentUser = requireActiveUser(state, currentUserId, res);
  if (!currentUser) return;
  if (!canManageRecharges(currentUser)) {
    return res.status(403).json({ message: 'No tienes permiso para gestionar recargas.' });
  }
  const recharge = state.recharges.find((item) => item.id === req.params.id);
  const plan = state.plans.find((item) => item.id === recharge?.planId) || plans.find((item) => item.id === recharge?.planId);
  if (!recharge) return res.status(404).json({ message: 'Recarga no encontrada.' });
  const nextStatus = String(req.body.status || '');
  if (!['Pendiente de validacion', 'Aprobada', 'Rechazada'].includes(nextStatus)) {
    return res.status(400).json({ message: 'Estado de recarga invalido.' });
  }
  recharge.status = nextStatus;
  if (nextStatus === 'Aprobada' && plan && !state.investments.some((item) => item.rechargeId === recharge.id)) {
    state.investments.unshift({
      id: uid('inv'),
      userId: recharge.userId,
      planId: plan.id,
      amount: plan.amount,
      dailyProfit: plan.dailyProfit,
      durationDays: plan.durationDays,
      startedAt: new Date().toISOString(),
      active: true,
      rechargeId: recharge.id
    });
    const activatedUser = state.users.find((user) => user.id === recharge.userId);
    if (activatedUser?.referredBy) {
      const referral = state.referrals.find((item) => item.userId === activatedUser.referredBy && item.name === activatedUser.name);
      if (referral) {
        referral.status = 'Activo';
        referral.investedAmount = plan.amount;
      }
    }
    if (activatedUser) {
      createMultilevelReferralBonuses(state, activatedUser, plan, recharge.id);
    }
  }
  state.movements = state.movements.map((item) =>
    item.id === `mov-${recharge.id}` || (item.userId === recharge.userId && item.type === 'Deposito' && item.amount === Number(recharge.amount) && item.status === 'Pendiente de validacion')
      ? { ...item, status: nextStatus }
      : item
  );
  const nextState = await writeDb(state, currentUserId);
  await logAdminAction(state, currentUserId, nextStatus, 'recharge', recharge.id, { userId: recharge.userId, amount: recharge.amount });
  res.json(clientState(nextState, currentUserId));
});

app.patch('/api/withdrawals/:id', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  const currentUser = requireActiveUser(state, currentUserId, res);
  if (!currentUser) return;
  if (!canManageWithdrawals(currentUser)) {
    return res.status(403).json({ message: 'No tienes permiso para gestionar retiros.' });
  }
  const withdrawal = state.withdrawals.find((item) => item.id === req.params.id);
  if (!withdrawal) return res.status(404).json({ message: 'Retiro no encontrado.' });
  const nextStatus = String(req.body.status || '');
  if (!['Pendiente', 'Aprobado', 'Rechazado', 'Pagado'].includes(nextStatus)) {
    return res.status(400).json({ message: 'Estado de retiro invalido.' });
  }
  withdrawal.status = nextStatus;
  state.movements = state.movements.map((item) =>
    item.id === `mov-${withdrawal.id}` || (item.userId === withdrawal.userId && item.type === 'Retiro' && item.amount === -Number(withdrawal.amount) && item.status === 'Pendiente')
      ? { ...item, status: nextStatus }
      : item
  );
  const nextState = await writeDb(state, currentUserId);
  await logAdminAction(state, currentUserId, nextStatus, 'withdrawal', withdrawal.id, { userId: withdrawal.userId, amount: withdrawal.amount });
  res.json(clientState(nextState, currentUserId));
});

app.post('/api/chat', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  if (!requireActiveUser(state, currentUserId, res)) return;
  const now = new Date().toISOString();
  state.chat.push(
    { id: uid('chat'), userId: currentUserId, from: 'user', text: req.body.text, createdAt: now },
    {
      id: uid('chat'),
      userId: currentUserId,
      from: 'support',
      text: 'Gracias por escribir. Un asesor revisara tu caso. Recargas y retiros se validan manualmente por transferencia bancaria.',
      createdAt: now
    }
  );
  res.json(clientState(await writeDb(state, currentUserId), currentUserId));
});

app.patch('/api/users/:id', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  if (!requireActiveUser(state, currentUserId, res)) return;
  const currentUser = state.users.find((user) => user.id === currentUserId);
  const user = state.users.find((item) => item.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
  if (currentUserId !== user.id && !canManageSystem(currentUser)) {
    return res.status(403).json({ message: 'No tienes permiso para editar este perfil.' });
  }
  if (Array.isArray(req.body.bankMethods)) {
    user.bankMethods = req.body.bankMethods.map((item) => String(item).trim()).filter(Boolean);
  }
  if (req.body.password) {
    const nextPassword = String(req.body.password);
    if (nextPassword.length < 6) {
      return res.status(400).json({ message: 'La clave debe tener al menos 6 caracteres.' });
    }
    user.password = hashPassword(nextPassword);
  }
  res.json(clientState(await writeDb(state, currentUserId), currentUserId));
});

app.patch('/api/admin/users/:id/block', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  if (!requireActiveUser(state, currentUserId, res)) return;
  const currentUser = state.users.find((user) => user.id === currentUserId);
  if (!canManageSystem(currentUser)) {
    return res.status(403).json({ message: 'Solo administracion puede bloquear usuarios.' });
  }
  const user = state.users.find((item) => item.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
  if (user.id === currentUserId) {
    return res.status(400).json({ message: 'No puedes bloquear tu propia cuenta de administrador.' });
  }
  user.blocked = Boolean(req.body.blocked);
  const nextState = await writeDb(state, currentUserId);
  await logAdminAction(state, currentUserId, user.blocked ? 'block_user' : 'unblock_user', 'user', user.id, { phone: user.email });
  res.json(clientState(nextState, currentUserId));
});

app.patch('/api/admin/payment-accounts', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  if (!requireActiveUser(state, currentUserId, res)) return;
  const currentUser = state.users.find((user) => user.id === currentUserId);
  if (!canManageSystem(currentUser)) {
    return res.status(403).json({ message: 'Solo administracion puede editar las cuentas de pago.' });
  }
  state.paymentAccounts = req.body.paymentAccounts.map((account) => ({
    id: account.id || uid('pay'),
    bank: String(account.bank || '').trim(),
    accountHolder: String(account.accountHolder || '').trim(),
    accountNumber: String(account.accountNumber || '').trim(),
    accountType: String(account.accountType || '').trim(),
    active: Boolean(account.active)
  })).filter((account) => account.bank && account.accountNumber);
  const nextState = await writeDb(state, currentUserId);
  await logAdminAction(state, currentUserId, 'update_payment_accounts', 'payment_accounts', null, { count: state.paymentAccounts.length });
  res.json(clientState(nextState, currentUserId));
});

app.patch('/api/admin/plans', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  if (!requireActiveUser(state, currentUserId, res)) return;
  const currentUser = state.users.find((user) => user.id === currentUserId);
  if (!canManageSystem(currentUser)) {
    return res.status(403).json({ message: 'Solo administracion puede editar los planes.' });
  }
  state.plans = req.body.plans.map((plan) => {
    const amount = Number(plan.amount);
    const roiPercent = Number(plan.roiPercent);
    return {
      id: String(plan.id || uid('plan')),
      name: String(plan.name || '').trim(),
      amount,
      roiPercent,
      dailyProfit: Math.round(amount * roiPercent / 100),
      durationDays: Number(plan.durationDays) || 30
    };
  }).filter((plan) => plan.id && plan.name && plan.amount > 0 && plan.roiPercent > 0);
  const nextState = await writeDb(state, currentUserId);
  await logAdminAction(state, currentUserId, 'update_plans', 'plans', null, { count: state.plans.length });
  res.json(clientState(nextState, currentUserId));
});

app.patch('/api/admin/gift-codes', async (req, res) => {
  const currentUserId = clientId(req);
  const state = await readDb();
  if (!requireActiveUser(state, currentUserId, res)) return;
  const currentUser = state.users.find((user) => user.id === currentUserId);
  if (!canManageSystem(currentUser)) {
    return res.status(403).json({ message: 'Solo administracion puede editar los codigos de regalo.' });
  }
  const existingById = new Map(state.giftCodes.map((giftCode) => [giftCode.id, giftCode]));
  const seenCodes = new Set();
  state.giftCodes = (req.body.giftCodes || []).map((giftCode) => {
    const code = String(giftCode.code || '').trim().toUpperCase();
    if (!code || seenCodes.has(code)) return null;
    seenCodes.add(code);
    const existing = existingById.get(giftCode.id);
    return {
      id: String(giftCode.id || uid('gift')),
      code,
      amount: Number(giftCode.amount) || 0,
      active: Boolean(giftCode.active),
      createdAt: giftCode.createdAt || existing?.createdAt || new Date().toISOString(),
      redeemedBy: Array.isArray(existing?.redeemedBy) ? existing.redeemedBy : Array.isArray(giftCode.redeemedBy) ? giftCode.redeemedBy : []
    };
  }).filter((giftCode) => giftCode && giftCode.code && giftCode.amount > 0);
  const nextState = await writeDb(state, currentUserId);
  await logAdminAction(state, currentUserId, 'update_gift_codes', 'gift_codes', null, { count: state.giftCodes.length });
  res.json(clientState(nextState, currentUserId));
});

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(rootDir, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(rootDir, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`RENKAR API listening on http://localhost:${port}`);
  writeJsonBackup().catch((error) => console.error('Initial backup error:', error.message));
  const backupHours = Number(process.env.BACKUP_INTERVAL_HOURS || 6);
  if (process.env.ENABLE_JSON_BACKUPS === 'true') {
    setInterval(() => {
      writeJsonBackup().catch((error) => console.error('Scheduled backup error:', error.message));
    }, Math.max(1, backupHours) * 60 * 60 * 1000);
  }
});
