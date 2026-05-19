# ARAY ARC balance and subscriptions

Date: 2026-05-11

## Decision

ARC should launch first as an internal service balance: credits, bonuses, cashback and ARAY AI fuel inside ARAY Production. Public product language should use "ARC balance", not "coin".

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

- fixed internal accounting rate for launch: `1 ARC = 50 RUB`;
- top up balance by bank card, SBP or invoice through an acquiring/payment provider;
- top up after bank invoice payment: owner/admin marks invoice as paid only after money is visible on the company bank account or matched by bank statement import;
- show paid ARC and bonus ARC separately;
- one-click payment from ARC balance for ARAY services, modules and monthly support;
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
- every manual accrual requires actor, reason, source document, timestamp and audit note;
- every automatic accrual requires provider event, invoice or bank statement match;
- no negative balance;
- no hidden manual edits;
- every debit has a source document or usage record;
- bonus ARC is not refundable and can expire;
- paid ARC refund rules follow the public offer and payment provider flow.

Launch accounting flow:

1. Customer receives invoice or opens payment form.
2. RUB payment goes to the official company account or payment provider.
3. ARAY creates a `PaymentProviderEvent` or bank statement match.
4. If automation is not connected, admin presses "paid" manually and must attach/choose the payment source.
5. Ledger credits paid ARC by the fixed rate: `paidRUB / 50 = paidARC`.
6. Bonuses, cashback and partner rewards go to a separate bonus ARC bucket.
7. Every change is visible in wallet history and can be reversed only by a new correcting ledger entry.

Suggested data model:

- `ArcWallet`: owner, tenant, paid balance, bonus balance, status;
- `ArcLedgerEntry`: credit/debit, paid/bonus bucket, amount, reason, source type/id, idempotency key;
- `BillingPlan`: plan code, monthly price, limits, included AI credits;
- `ServicePackage`: business-facing package/status level, available modules, support scope and monthly ARC price;
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

## Service packages and status levels

Avoid presenting this only as dry "tariffs". Public language should feel like business support levels:

- Start: launch and basic maintenance;
- Growth: marketing, analytics and CRM routines;
- Pro: stronger automation, integrations and priority help;
- Partner: partner workspace, clients and project revenue tracking;
- Enterprise: custom SLA, integrations, roles and reports.

Gamification should be useful, not manipulative:

- status grows when a business keeps data clean, pays on time, connects analytics and completes launch checklist;
- higher status can unlock bonus ARC, priority support, extra AI limits, partner badges and better automation templates;
- no fake urgency, no hidden paid traps, no promise of income;
- owner always sees what costs ARC now, what is included, and what will renew automatically.

## Phase 3: partner rewards and payouts

ARC can track partner rewards, but ruble payouts must be separate:

- employee: salary/bonus;
- self-employed: service payment with receipt;
- IP/LLC: invoice, contract, act;
- agent: agency reward by agreement;
- creator/designer/blogger: service or license fee.

ARC may help calculate the reward, but the ruble payout must happen through a legal payment scenario with taxes, documents and operation history.

Partner flow for ARAY services:

- client orders project/subscription through partner page;
- partner issues invoice or receives payment under the chosen legal model;
- ARAY records project, partner, client, amount and expected platform share;
- partner balance shows obligation to ARAY and reward history;
- ARC can mirror the internal value of the project/subscription, but it does not replace documents, taxes or bank payments;
- platform owner can add, correct or freeze partner ARC only through ledger actions with reason.

Manual and automatic controls:

- manual credit/debit: available only to platform owner/admin, with reason and document;
- automatic credit: from acquiring, SBP, bank statement or signed invoice status;
- automatic debit: subscription, AI usage, paid modules, storage and integrations;
- limits: daily/monthly debit ceilings and low-balance warnings;
- reconciliation: list of payments without ARC, ARC without payment, failed webhooks and suspicious duplicates.

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
- "paid ARC";
- "AI fuel";
- "pay subscription from balance";
- "top up balance";
- "operation history".

Avoid before legal review:

- "coin";
- "token";
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
