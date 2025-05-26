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
exports.responderAgent = responderAgent;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const openai_1 = require("openai");
const openai = new openai_1.OpenAI({ apiKey: "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" });
async function responderAgent(context) {
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
