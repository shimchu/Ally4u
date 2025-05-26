// global.d.ts
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import puppeteer from 'puppeteer';
// @ts-ignore
const axeSource = require('axe-core');


export async function getRelevantContext(): Promise<string> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return '';
  const doc = editor.document;
  const position = editor.selection.active.line;
  const start = Math.max(0, position - 50);
  const end = Math.min(doc.lineCount, position + 50);
  return doc.getText(new vscode.Range(start, 0, end, 1000));
}

export async function getAccessibilityLogs(): Promise<string> {
  try {
    // 1. Get 50 lines around cursor
    const editor = vscode.window.activeTextEditor;
    if (!editor) throw new Error('No active editor');
    if (editor.document.languageId !== 'html') {
  throw new Error('Accessibility audit supports only HTML documents for now.');
}
    const totalLines = editor.document.lineCount;
    const cursorLine = editor.selection.active.line;

    const startLine = Math.max(0, cursorLine - 50);
    const endLine = Math.min(totalLines - 1, cursorLine + 50);

    const range = new vscode.Range(
      startLine,
      0,
      endLine,
      editor.document.lineAt(endLine).text.length
    );
    const snippet = editor.document.getText(range);

    // 2. Wrap snippet in minimal HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head><title>A11y Test</title></head>
<body>
${snippet}
</body>
</html>`;

    // 3. Run axe-core in Puppeteer
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate((axeSrc: string) => {
      const script = document.createElement('script');
      script.textContent = axeSrc;
      document.head.appendChild(script);
    }, axeSource.source);

    const results = await page.evaluate(async () => {
      return await (window as any).axe.run();
    });

    await browser.close();

    const log = JSON.stringify(results, null, 2);

    // 5. Read back and return content
    interface AxeNode {
      html: string;
      target: string[];
    }

    interface AxeViolation {
      id: string;
      impact: string;
      nodes: AxeNode[];
    }

    interface AxeResults {
      violations: AxeViolation[];
      [key: string]: any;
    }

    const contextOnly: string = (results as AxeResults).violations.map((v: AxeViolation) => {
      return v.nodes.map((n: AxeNode) => `Issue: ${v.id}\nImpact: ${v.impact}\nHTML: ${n.html}\nTarget: ${n.target.join(', ')}\n`);
    }).flat().join('\n\n');

return contextOnly || 'No accessibility violations found.';

  } catch (error) {
    return `Error running accessibility audit: ${(error as Error).message}`;
  }
}

export async function getLogContext(): Promise<string> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return '';
  const logPath = `${workspaceFolders[0].uri.fsPath}/accessibility.log`;
  try {
    return fs.readFileSync(logPath, 'utf8');
  } catch {
    return '';
  }
}
