# ARAY ARC wallet and subscriptions

Date: 2026-05-11

## Decision

ARC should launch first as an internal service balance: credits, bonuses, cashback and ARAY AI fuel inside ARAY Production.

For the first deploy ARC must not be presented as a guaranteed investment, external money replacement, public payment system or promise of income. Public copy should say: service credits, internal balance, bonus ARC, paid ARC, subscription and AI usage balance.

## Why this is the safe launch path

The current project docs already define ARC as:

- internal accounting unit;
- bonus and cashback;
- prepaid services;
- AI fuel;
- partner contribution marker;
- not a promise of yield.

The code already has:

- `Payment` for order payments and receipt links;
- `ApiSubscription` for infrastructure and AI provider costs;
- `ArayTokenLog` for AI usage cost tracking;
- finance/analytics checks for current admin data.

The code does not yet have a production wallet ledger. Before auto-debits and transfers we need immutable accounting models.

## Phase 1: deploy-ready wallet

Goal: let a business owner pay for PiloRus/ARAY subscriptions and AI usage from one balance.

Features:

- top up balance by bank card, SBP or invoice through an acquiring/payment provider;
- show paid ARC and bonus ARC separately;
- auto-debit monthly subscription;
- auto-debit ARAY AI usage with daily/monthly limits;
- low balance warnings;
- one-click payment fallback when balance is not enough;
- full operation history;
- invoices, receipts and provider payment status;
- admin adjustment only with reason and audit log.

Rules:

- store money amounts in integer minor units, not floats;
- make ledger entries immutable;
- use idempotency keys for webhooks and charges;
- no negative balance;
- no hidden manual edits;
- every debit has a source document or usage record;
- bonus ARC is not refundable and can expire;
- paid ARC refund rules follow the public offer and payment provider flow.

Suggested data model:

- `ArcWallet`: owner, tenant, paid balance, bonus balance, status;
- `ArcLedgerEntry`: credit/debit, paid/bonus bucket, amount, reason, source type/id, idempotency key;
- `BillingPlan`: plan code, monthly price, limits, included AI credits;
- `TenantSubscription`: tenant, plan, status, next charge date, payment mode;
- `UsageCharge`: ARAY usage cost grouped from `ArayTokenLog`;
- `PaymentProviderEvent`: raw webhook, status, idempotency and reconciliation.

## Phase 2: transfers

User-to-user ARC transfers should not be enabled as free money movement in the first deploy.

Safe version:

- transfer only bonus/service ARC inside platform;
- no withdrawal;
- limits per day/month;
- reason field;
- anti-fraud checks;
- sender and receiver history;
- admin dispute/reversal flow.

If we want real money-like P2P transfers or withdrawal, use a licensed payment/banking/e-money provider and a separate legal/accounting design.

## Phase 3: partner rewards and payouts

ARC can track partner rewards, but ruble payouts must be separate:

- employee: salary/bonus;
- self-employed: service payment with receipt;
- IP/LLC: invoice, contract, act;
- agent: agency reward by agreement;
- creator/designer/blogger: service or license fee.

ARC may help calculate the reward, but the ruble payout must happen through a legal payment scenario with taxes, documents and operation history.

## Required before public launch

- IP/company bank account;
- acquiring or payment provider;
- fiscal receipt provider or online cash register flow;
- public offer and refund rules;
- privacy policy and data processing agreement;
- subscription terms and cancellation flow;
- ARC balance rules;
- anti-fraud policy for bonuses and referrals;
- admin reconciliation page.

## Product copy

Use:

- "ARC balance";
- "service credits";
- "bonus ARC";
- "AI fuel";
- "pay subscription from balance";
- "top up balance";
- "operation history".

Avoid before legal review:

- "investment";
- "guaranteed income";
- "buyback";
- "profit";
- "deposit";
- "bank wallet";
- "withdraw instantly";
- "public payment system".

## Recommended launch scope

For the nearest deploy:

1. Ship subscriptions and ARAY AI cost controls.
2. Add ARC wallet foundation as internal ledger.
3. Connect top-up through a provider after the IP account is ready.
4. Enable automatic subscription and AI debits.
5. Keep transfers hidden behind feature flag until legal/accounting review.
