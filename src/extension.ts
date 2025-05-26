// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const ANNOTATION_PROMPT = `You are an accessibility expert helping developers improve the accessibility of their code. Your job is to review a block of code provided by the user and annotate any lines where accessibility can be improved, with a brief suggestion and the reason for your recommendation. Only make suggestions when the change will have a meaningful impact on accessibility. Be supportive and constructive in your feedback. Format each suggestion as a single JSON object. Do not wrap your response in triple backticks. Here is an example of what your response should look like:

{ "line": 5, "suggestion": "Consider adding an aria-label to this button for screen reader users." }{ "line": 18, "suggestion": "Ensure color contrast meets accessibility standards for better readability." }
`;
const CHAT_PROMPT =
	'You are an accessibility coding assistant. Your job is to help developers understand and improve the accessibility of their code. Provide clear, supportive guidance, explain accessibility concepts, and offer practical examples. Encourage best practices and help users learn how to make their code more accessible. If the user asks a non-programming or non-accessibility question, politely decline to respond.';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ally4u" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerTextEditorCommand('ally4u.accessibilityCopilot', async (textEditor: vscode.TextEditor) => {
	// The code you place here will be executed every time your command is executed
	// Display a message box to the user
	vscode.window.showInformationMessage('Ally4u Activated - Accessibility Copilot is ready!');
	// Get the code with line numbers from the current editor
	const codeWithLineNumbers = getVisibleCodeWithLineNumbers(textEditor);
  	// select the 4o chat model
    let [model] = await vscode.lm.selectChatModels({
      vendor: 'copilot',
      family: 'gpt-4o'
    });
	// init the chat message
    const messages = [
      vscode.LanguageModelChatMessage.User(ANNOTATION_PROMPT),
      vscode.LanguageModelChatMessage.User(codeWithLineNumbers)
    ];
	// make sure the model is available
    if (model) {
      // send the messages array to the model and get the response
      let chatResponse = await model.sendRequest(
        messages,
        {},
        new vscode.CancellationTokenSource().token
      );

      // handle chat response
      await parseChatResponse(chatResponse, textEditor);
    }
	
	// Chat assistant
	// define a chat handler
	const handler: vscode.ChatRequestHandler = async (
		request: vscode.ChatRequest,
		context: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	) => {

		// console.log('Chat request received:', request);
		// console.log('Chat context:', context);
		
		// initialize the prompt
		let prompt = CHAT_PROMPT;

		// Active file context
		const editor = vscode.window.activeTextEditor;
		let ActiveFileContext = '';
		if (editor) {
			// get the file name and path
			const fileName = editor.document.fileName;
			const visibleCode = getVisibleCodeWithLineNumbers(editor);
			ActiveFileContext = `Current Active File: ${fileName}\n\nCode:\n${visibleCode}`;
			// add the file context to the prompt
			prompt += `\n\n${ActiveFileContext}`;
		}

		// file context
		// references from Copilot (uploaded files, visible code, etc.)
		if (request.references && request.references.length > 0) {
			for (const ref of request.references) {
				try {
					const uri = vscode.Uri.parse(ref.id);
					// Only load file:// references (skip internal ones like "vscode.implicit.viewport")
					if (uri.scheme === 'file') {
						const content = await vscode.workspace.fs.readFile(uri);
						const text = Buffer.from(content).toString('utf8');

						prompt += `\n\n📎 Reference File: ${ref.id}\n\n${text}`;
					} else {
						// fallback: include the ref.value if available
						if (ref.value) {
							prompt += `\n\n📎 Context: ${ref.id}\n\n${ref.value}`;
						}
					}
				
				} catch (err) {
					console.warn(`Failed to load reference: ${ref.id}`, err);
				}
			}
		}
		console.log('Prompt for chat request:', prompt);
		// initialize the messages array with the prompt
		const messages = [vscode.LanguageModelChatMessage.User(prompt)];

	
		// get all the previous participant messages
		const previousMessages = context.history.filter(
			h => h instanceof vscode.ChatResponseTurn
		);

		// add the previous messages to the messages array
		previousMessages.forEach(m => {
			let fullMessage = '';
			m.response.forEach(r => {
			const mdPart = r as vscode.ChatResponseMarkdownPart;
			fullMessage += mdPart.value.value;
			});
			messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
		});
		
		// add in the user's message
		messages.push(vscode.LanguageModelChatMessage.User(request.prompt));
		// send the request
		const chatResponse = await request.model.sendRequest(messages, {}, token);

		// stream the response
		for await (const fragment of chatResponse.text) {
			stream.markdown(fragment);
		}
		return;
	};

	// create participant
	const chat_agent = vscode.chat.createChatParticipant('chat-ally4u.accessibility-agent', handler);

	// add icon to participant
	// chat_agent.iconPath = vscode.Uri.joinPath(context.extensionUri, 'chat_agent.jpeg');

	});


	context.subscriptions.push(disposable);
}

function applyDecoration(editor: vscode.TextEditor, line: number, suggestion: string) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: ` ${suggestion.substring(0, 25) + '...'}`,
      color: 'grey'
    }
  });

  // get the end of the line with the specified line number
  const lineLength = editor.document.lineAt(line - 1).text.length;
  const range = new vscode.Range(
    new vscode.Position(line - 1, lineLength),
    new vscode.Position(line - 1, lineLength)
  );

  const decoration = { range: range, hoverMessage: suggestion };

  vscode.window.activeTextEditor?.setDecorations(decorationType, [decoration]);
}


async function parseChatResponse(
  chatResponse: vscode.LanguageModelChatResponse,
  textEditor: vscode.TextEditor
) {
  let accumulatedResponse = '';

  for await (const fragment of chatResponse.text) {
    accumulatedResponse += fragment;

    // if the fragment is a }, we can try to parse the whole line
    if (fragment.includes('}')) {
      try {
        const annotation = JSON.parse(accumulatedResponse);
        applyDecoration(textEditor, annotation.line, annotation.suggestion);
        // reset the accumulator for the next line
        accumulatedResponse = '';
      } catch (e) {
        // do nothing
      }
    }
  }
}

function getVisibleCodeWithLineNumbers(textEditor: vscode.TextEditor) {
  // get the position of the first and last visible lines
  let currentLine = textEditor.visibleRanges[0].start.line;
  const endLine = textEditor.visibleRanges[0].end.line;

  let code = '';

  // get the text from the line at the current position.
  // The line number is 0-based, so we add 1 to it to make it 1-based.
  while (currentLine < endLine) {
    code += `${currentLine + 1}: ${textEditor.document.lineAt(currentLine).text} \n`;
    // move to the next line position
    currentLine++;
  }
  return code;
}


// This method is called when your extension is deactivated
export function deactivate() {}
