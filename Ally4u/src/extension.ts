/// <reference path="../vscode.proposed.chatProvider.d.ts" />

import * as vscode from 'vscode';
import { getRelevantContext, getLogContext, getAccessibilityLogs } from './utils/context';
import { responderAgent } from './agents/responder';
import { correctionAgent } from './agents/corrector';
import { reminderAgent } from './agents/reminder';
import { generateAltSuggestion} from './agents/altgen';

export function activate(context: vscode.ExtensionContext) {
  const handler : vscode.ChatRequestHandler = async (request: vscode.ChatRequest,
  context: vscode.ChatContext,
  response: vscode.ChatResponseStream)=> {
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
        const { altSuggestion, reminderNote } = await generateAltSuggestion(imageUrl, currentAlt);
        let reply = `### Alt Text Suggestion\n> ${altSuggestion}`;
        if (reminderNote) {
          reply += `\n\n**Reminder:** ${reminderNote}`;
        }
        response.markdown(reply);
      } catch (err: any) {
        console.error(err);
        response.markdown(`Error generating alt text: ${err.message || err}`);
      }
      return; // Don't fall through to other agents
    }



    //const codeContext = await getRelevantContext();
    const logContext = await getAccessibilityLogs();
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
        if (!editor) throw new Error('No active editor');
        if (editor.document.languageId !== 'html') {
      throw new Error('Accessibility audit supports only HTML documents for now.');
    }
        const totalLines = editor.document.lineCount;
        const cursorLine = editor.selection.active.line;
    
        const startLine = Math.max(0, cursorLine - 2);
        const endLine = Math.min(totalLines - 1, cursorLine + 2);
    
        const range = new vscode.Range(
          startLine,
          0,
          endLine,
          editor.document.lineAt(endLine).text.length
        );
        const snippet = editor.document.getText(range);
    
      const chatHistory = (request as any).history ?? [];
      const chatContext = {
        prompt: userMessage,
        logContext,
        history: chatHistory,
        code: snippet
      };
      console.log('Chat Context:', chatContext);
      const responderReply = await responderAgent(chatContext);
      const correctionReply = await correctionAgent(chatContext);
      const reminderReply = await reminderAgent({
        responderResponse: responderReply,
        // chatHistory: context.messages // Removed because 'messages' does not exist on ChatContext
      });

      response.markdown(`### Responder\n${responderReply}`);
      response.markdown(`---\n### Correction\n${correctionReply}`);
      response.markdown(`---\n### Reminder\n${reminderReply}`);

    }
    const participant = vscode.chat.createChatParticipant('ally', handler);
}
