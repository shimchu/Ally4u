"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correctionAgent = correctionAgent;
const openai_1 = require("openai");
async function correctionAgent(context) {
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
async function fetchOpenAI(prompt) {
    const openai = new openai_1.OpenAI({ apiKey: "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" });
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }]
    });
    return response.choices[0]?.message.content ?? '';
}
