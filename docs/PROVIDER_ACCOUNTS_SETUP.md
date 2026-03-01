# Provider Accounts & Environment Setup

To orchestrate the system safely and profitably, the platform relies on three primary external accounts:

## 1. AI Provider: Google Cloud / Google AI Studio (Gemini)

* **Account Needed**: A Google Cloud Project with the Vertex AI / Gemini API enabled.
* **Free Tier Setup**: Generate an API Key via Google AI Studio. This allows free input/output tokens but applies stricter Rate Limits (RPM/TPM). Perfect for the Free users pool and local development.
* **Paid Tier Setup**: Link a billing account in Google Cloud to unlock the Pay-as-you-go tier. This lifts rate limits and charges per 1M tokens. Used exclusively for the €15.99 paid users.

## 2. Free Email Provider: Mailrelay

* **Account Needed**: Mailrelay Free Account.
* **Usage**: Provides up to 80,000 emails per month and 20,000 contacts for free.
* **Integration**: Used via SMTP or their API. The platform will use a generic sender domain or authenticated user domains to process all "Free Tier" email campaigns until the 80k global pool is exhausted.

## 3. Paid Email Provider: Amazon AWS (SES)

* **Account Needed**: AWS Account with Amazon Simple Email Service (SES) out of the sandbox.
* **Usage**: Handles all paid user traffic. Costs $0.10 per 1,000 emails sent.
* **Integration**: Used via the AWS SDK. SES handles high deliverability, dedicated IPs (if needed later), and high-throughput parallel sending without congesting the platform's local servers.
