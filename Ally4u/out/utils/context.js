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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRelevantContext = getRelevantContext;
exports.getAccessibilityLogs = getAccessibilityLogs;
exports.getLogContext = getLogContext;
// global.d.ts
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs-extra"));
const puppeteer_1 = __importDefault(require("puppeteer"));
// @ts-ignore
const axeSource = require('axe-core');
async function getRelevantContext() {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return '';
    const doc = editor.document;
    const position = editor.selection.active.line;
    const start = Math.max(0, position - 50);
    const end = Math.min(doc.lineCount, position + 50);
    return doc.getText(new vscode.Range(start, 0, end, 1000));
}
async function getAccessibilityLogs() {
    try {
        // 1. Get 50 lines around cursor
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            throw new Error('No active editor');
        if (editor.document.languageId !== 'html') {
            throw new Error('Accessibility audit supports only HTML documents for now.');
        }
        const totalLines = editor.document.lineCount;
        const cursorLine = editor.selection.active.line;
        const startLine = Math.max(0, cursorLine - 50);
        const endLine = Math.min(totalLines - 1, cursorLine + 50);
        const range = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
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
        const browser = await puppeteer_1.default.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' });
        await page.evaluate((axeSrc) => {
            const script = document.createElement('script');
            script.textContent = axeSrc;
            document.head.appendChild(script);
        }, axeSource.source);
        const results = await page.evaluate(async () => {
            return await window.axe.run();
        });
        await browser.close();
        const log = JSON.stringify(results, null, 2);
        const contextOnly = results.violations.map((v) => {
            return v.nodes.map((n) => `Issue: ${v.id}\nImpact: ${v.impact}\nHTML: ${n.html}\nTarget: ${n.target.join(', ')}\n`);
        }).flat().join('\n\n');
        return contextOnly || 'No accessibility violations found.';
    }
    catch (error) {
        return `Error running accessibility audit: ${error.message}`;
    }
}
async function getLogContext() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders)
        return '';
    const logPath = `${workspaceFolders[0].uri.fsPath}/accessibility.log`;
    try {
        return fs.readFileSync(logPath, 'utf8');
    }
    catch {
        return '';
    }
}
