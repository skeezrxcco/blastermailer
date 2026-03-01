# Infrastructure & Providers

## 1. AI Providers

- **Gemini (Primary)**: Use Google AI SDK. Default for all tiers.
- **OpenRouter (Secondary)**: Use for GPT-4.5/Claude options in Boost/Max modes.
- **Local AI**: REMOVE all Llama/Local models to save dev resources. Use Gemini Free Tier for development.

## 2. Email Providers

- **Mailrelay**: Use for Free Tier. API monitoring required to track the 80k global limit.
- **AWS SES**: Use for Paid Tier. Programmatic monitoring via CloudWatch/SES API for daily caps.
x