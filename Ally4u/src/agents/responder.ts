import * as dotenv from 'dotenv';
dotenv.config();
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey:"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" });


export async function responderAgent(context: any): Promise<string> {
  const prompt = `
You are an accessibility coach helping a developer who is unfamiliar with accessibility standards. 
Write user interface code that fully conforms to WCAG 2.1 level AA criteria and explain the accessibility issue relevant to the developer's prompt and cite any resources used. 

- Use reputable sources such as w3.org and webaim.org for guidelines and provide relevant links for further learning.
- Do not use placeholder variables; clearly indicate where meaningful values should be inserted.
- Focus only on the developer's current request (the developer prompt), don't give any extra information or context unless it directly relates to the prompt.

Developer prompt:
${context.prompt},
If developer prompt is generic like a 'hi' or unrelated to accessibility, prioritize answering the request without introducing accessibility unless directly relevant.
Code context around 5 lines around the cursor:
${context.code},
Chat History: ${context.history}

Provide clear, accessible code suggestions along with short explanations.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }]
  });

  return response.choices[0]?.message.content ?? 'No suggestion available.';
}
