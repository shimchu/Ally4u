"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAltSuggestion = generateAltSuggestion;
const openai_1 = require("openai");
const openai = new openai_1.OpenAI({ apiKey: "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" });
async function generateAltSuggestion(imageUrl, currentAlt) {
    const systemPrompt = `
You are an accessibility expert.
Given an image and its current alt text, decide:
1. Whether the alt text accurately describes the image
2. If not, generate a better one
3. Do NOT assume whether the image is decorative — just assume it's instrumental
4. Output ONLY the suggested alt text.
`;
    const userPrompt = `
Image URL: ${imageUrl}
Current alt text: "${currentAlt}"

Instructions: Suggest an improved alt text assuming the image is instrumental.
`;
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
    });
    const suggestion = response.choices[0]?.message.content?.trim() || "No suggestion";
    const reminder = `This is the suggested alt text assuming the image is instrumental to the webpage. 
If it is decorative — leave alt empty. 
Decorative images should also have role="presentation" or aria-hidden="true" and are used purely for layout, 
like borders, spacers, or background embellishments. 
The page is still understandable if the element is removed.`;
    return {
        altSuggestion: suggestion,
        reminderNote: reminder,
    };
}
