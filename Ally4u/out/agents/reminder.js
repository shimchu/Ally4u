"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderAgent = reminderAgent;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const openai_1 = require("openai");
async function reminderAgent({ responderResponse }) {
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
async function fetchOpenAI(prompt) {
    const openai = new openai_1.OpenAI({ apiKey: "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" });
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }]
    });
    return response.choices[0]?.message.content ?? '';
}
