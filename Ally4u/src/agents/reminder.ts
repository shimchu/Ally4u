import * as dotenv from 'dotenv';
dotenv.config();
import { OpenAI } from 'openai';
export async function reminderAgent({ responderResponse }: any): Promise<string> {
  const prompt = `
You are an assistant reminding a developer of any additional manual steps needed to meet accessibility standards after AI-generated code suggestions.

- Keep reminders short and to one line.
- Only send reminders if necessary; otherwise, respond with "No reminders needed."
- Examples: remind to replace placeholder attributes with meaningful values, check color contrast visually, or manually review labels.
Keep in mind the examples above and especially code changes altering website visually or functionality that may require manual verification.

Review the recent AI-generated code suggestions:
${responderResponse}

`;

  const response = await fetchOpenAI(prompt);
  return response;
}

async function fetchOpenAI(prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey: "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" });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }]
  });
  return response.choices[0]?.message.content ?? '';
}

