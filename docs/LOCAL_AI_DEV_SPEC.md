# Local AI Development & Prompt Engineering (Gemini-Only)

## 1. Deprecating Local Llama

Running local models like Llama requires significant compute resources, GPU management, and complicates the Docker stack. We are standardizing entirely on the **Gemini API** for both local development and production.

## 2. Setting up the "Local" Gemini Emulator

Since Gemini runs on Google's infrastructure, "local development" means pointing your local server to the Gemini API using the Free Tier key.

* **Action**: Remove Llama binaries/containers from `docker-compose.yml`.
* **Env Variable**: Add `GEMINI_API_KEY_DEV` to your `.env.local`. The backend will use this key for all local testing.

## 3. Prompt Engineering Strategy

Instead of fine-tuning a model (which is expensive and rigid), we will use **System Instructions** and **Few-Shot Prompting** in the Gemini API to achieve the specific tone and formatting required by the platform.

### Standardized System Prompt Injection

Update `lib/ai-chat-orchestration.ts` to inject context dynamically:

```typescript
const systemInstruction = `
You are the AI assistant for BlasterMailer.
Your goal is to help users craft high-converting email campaigns.
Current Stage: ${activeStage}
User Tier: ${userTier}

Rules:
1. If the user is on the Free Tier, suggest concise emails (saves tokens).
2. If the user is on the Paid Tier, you may generate longer, complex HTML templates.
3. NEVER write placeholder text like [Insert Name]. Always use merge tags like {{contact.first_name}}.
`;
