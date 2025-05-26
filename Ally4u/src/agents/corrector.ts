
import { OpenAI } from 'openai';
export async function correctionAgent(context: any, ): Promise<string> {
  const prompt = `
You are reviewing accessibility error logs produced by an automated checker (axe DevTools Accessibility Linter).
Based on the accessibility logs below and the current code context, provide specific feedback and code snippets to fix the accessibility errors relevant to this part of the code.

Accessibility logs:
${context.logContext}

Current code context:
${context.code}

Only Suggest precise fixes with code examples addressing the errors above explaining how they resolve the issues.
Do not provide general advice or unrelated information.
`;

  const response = await fetchOpenAI(prompt);
  return response;
}

async function fetchOpenAI(prompt: string): Promise<string> {
  const openai = new OpenAI({ apiKey: "" });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }]
  });
  return response.choices[0]?.message.content ?? '';
}
