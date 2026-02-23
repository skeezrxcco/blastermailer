# Intelligent Orchestration & Financial Distribution System

## 1. System Objectives

This specification outlines a dynamic orchestration system that links AI model distribution and email sending events to a strict financial rule engine.
**Core Business Rule**: The platform must guarantee a minimum **15% profit margin** per paid user, preventing over-usage of infrastructure.

## 2. Financial Model & Limits

### Paid Tier (€15.99 / month)

* **Target Margin**: 15% minimum (€2.40 profit per user).
* **Budget Available for COGS (Cost of Goods Sold)**: ~€13.59 per user/month.
* **Resource Allocations**:
  * **Email Sending Limit**: Max 300 emails/day per user (9,000 emails/month).
  * **Email Cost**: Routed via Amazon SES. Cost is $0.10 per 1,000 emails. Sending 9,000 emails costs ~$0.90 (€0.85) per user/month.
  * **AI Cost (Gemini API)**: Routed via Google AI Paid Tier. With ~€12.74 remaining budget, users can consume a massive amount of tokens (millions of input/output tokens) on models like Gemini 1.5 Flash or Gemini 1.5 Pro before hitting the financial ceiling.
* **Enforcement**: The orchestration engine will track a `credit_balance` per workspace. If AI generation or email queues approach the €13.59 cost threshold, the system gracefully throttles the user, offering an add-on purchase.

### Free Tier (€0.00 / month)

* **Target Margin**: Loss leader (marketing acquisition). Cost must be strictly minimized.
* **Resource Allocations**:
  * **Email Sending Limit**: Pooled under the Mailrelay Free Plan limit of 80,000 emails/month.
  * **AI Cost (Gemini API)**: Routed via Gemini API Free Tier (rate limited, free of charge).
* **Enforcement**: Strict daily hard caps. Once the global 80k Mailrelay pool hits 90% utilization, free tier email sending is paused until the next billing cycle, prompting upgrades.

## 3. Technical Implementation (Workers & Queues)

* **Router Middleware**: Intercepts `/api/ai/generate` and `/api/campaigns/send`.
* **Tier Check**: Queries Redis session for user `tier`.
* **Queueing**:
  * Free users are placed in a low-priority NATS queue targeting the Mailrelay SMTP.
  * Paid users are placed in a high-priority NATS queue targeting the Amazon SES API.
