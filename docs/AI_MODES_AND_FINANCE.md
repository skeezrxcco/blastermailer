# AI Quality Modes & Dynamic Financial Routing

## 1. Quality Mode Mapping (Tier: Paid/Pro)
The system must allow users to toggle between modes. Each mode has a default model but allows a dropdown selection.

| Mode | UX Label | Default Model | Available Options (Dropdown) | Max Cost/1k Tokens |
| :--- | :--- | :--- | :--- | :--- |
| **Fast** | Performance | **Gemini 1.5 Flash** | GPT-3.5 Turbo, Gemini 1.5/2 Flash, Claude Haiku | ~$0.0001 |
| **Boost** | Balanced | **Gemini 2.0 Pro** | GPT-4o, Gemini 2.0 Pro, Claude 3.5 Sonnet | ~$0.0030 |
| **Max** | Creative/Deep | **Gemini 2.5 Flash** | GPT-4.5 (if avail), Gemini 2.5, Claude 3 Opus | ~$0.0150 |

## 2. Financial Orchestration Logic
- **Subscription**: €15.99/mo.
- **Net Budget (after 15% profit & fees)**: €12.50 for AI.
- **Rule**: Every AI request must be logged in a `Usage` table with its estimated cost.
- **Hard Limit**: If `sum(current_month_usage) >= 12.50`, the orchestrator **intercepts** the request and forces the model to `gemini-1.5-flash` (using the Free Tier key if necessary) to prevent financial loss.

## 3. Email Routing
- **Free Users**: Use Mailrelay (80k pool).
- **Pro Users**: Use AWS SES (cost: $0.10/1k emails).
- **Daily Cap**: 300 emails/day per user.