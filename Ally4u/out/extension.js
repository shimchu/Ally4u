"use strict";
/// <reference path="../vscode.proposed.chatProvider.d.ts" />
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
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const context_1 = require("./utils/context");
const responder_1 = require("./agents/responder");
const corrector_1 = require("./agents/corrector");
const reminder_1 = require("./agents/reminder");
const altgen_1 = require("./agents/altgen");
function activate(context) {
    const handler = async (request, context, response) => {
        console.log("Incoming Chat Request:", JSON.stringify(request, null, 2));
        const userMessage = request?.prompt;
        if (!userMessage) {
            response.markdown("Sorry, I didn't receive any message to respond to.");
            return;
        }
        //Handle /altgen command
        if (request.command === 'altgen') {
            const commandText = request.prompt.trim();
            const match = commandText.match(/"(.*?)"\s+(https?:\/\/\S+)/);
            if (!match) {
                response.markdown('Usage: `"current alt text" image_url`');
                return;
            }
            const currentAlt = match[1];
            const imageUrl = match[2];
            try {
                const { altSuggestion, reminderNote } = await (0, altgen_1.generateAltSuggestion)(imageUrl, currentAlt);
                let reply = `### Alt Text Suggestion\n> ${altSuggestion}`;
                if (reminderNote) {
                    reply += `\n\n**Reminder:** ${reminderNote}`;
                }
                response.markdown(reply);
            }
            catch (err) {
                console.error(err);
                response.markdown(`Error generating alt text: ${err.message || err}`);
            }
            return; // Don't fall through to other agents
        }
        //const codeContext = await getRelevantContext();
        const logContext = await (0, context_1.getAccessibilityLogs)();
        /*
        const codeContext = request.references?.map(ref => {
        if (
          ref.value &&
          typeof ref.value === 'object' &&
          'uri' in ref.value &&
          'range' in ref.value
        ) {
          return {
            uri: (ref.value as { uri: unknown }).uri,
            range: (ref.value as { range: unknown }).range,
            modelDescription: ref.modelDescription
          };
        }
        return null;
      }).filter(Boolean); */
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            throw new Error('No active editor');
        if (editor.document.languageId !== 'html') {
            throw new Error('Accessibility audit supports only HTML documents for now.');
        }
        const totalLines = editor.document.lineCount;
        const cursorLine = editor.selection.active.line;
        const startLine = Math.max(0, cursorLine - 2);
        const endLine = Math.min(totalLines - 1, cursorLine + 2);
        const range = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
        const snippet = editor.document.getText(range);
        const chatHistory = request.history ?? [];
        const chatContext = {
            prompt: userMessage,
            logContext,
            history: chatHistory,
            code: snippet
        };
        console.log('Chat Context:', chatContext);
        const responderReply = await (0, responder_1.responderAgent)(chatContext);
        const correctionReply = await (0, corrector_1.correctionAgent)(chatContext);
        const reminderReply = await (0, reminder_1.reminderAgent)({
            responderResponse: responderReply,
            // chatHistory: context.messages // Removed because 'messages' does not exist on ChatContext
        });
        response.markdown(`### Responder\n${responderReply}`);
        response.markdown(`---\n### Correction\n${correctionReply}`);
        response.markdown(`---\n### Reminder\n${reminderReply}`);
    };
    const participant = vscode.chat.createChatParticipant('ally', handler);
}
