import * as vscode from "vscode";
import { Statement, parseFirst } from "pgsql-ast-parser";
import { checkSemanticErrors } from "./semanticChecks";
import { SQLError, SQLErrorType } from "../types/SQLError";

function createSQLDiagnostic(
  document: vscode.TextDocument,
  match: RegExpExecArray,
  error: SQLError
): vscode.Diagnostic {
  const SQLErrorToSeverity: Record<SQLErrorType, vscode.DiagnosticSeverity> = {
    [SQLErrorType.Syntax]: vscode.DiagnosticSeverity.Error,
    [SQLErrorType.InsertValuesMismatch]: vscode.DiagnosticSeverity.Warning,
    [SQLErrorType.MissingParameter]: vscode.DiagnosticSeverity.Error,
  };

  const startPos = document.positionAt(match.index);
  const endPos = document.positionAt(match.index + match[0].length);
  const range = new vscode.Range(startPos, endPos);

  return {
    message: error.message,
    range,
    severity: SQLErrorToSeverity[error.type],
  };
}

interface CacheEntry {
  version: number;
  diagnostics: vscode.Diagnostic[];
}

/**
 * For caching diagnostics wrt document's version.
 */
const documentDiagnosticCache: Map<string, CacheEntry> = new Map();

export function subscribeSQlDiagnostic(
  context: vscode.ExtensionContext,
  diagnosticCollection: vscode.DiagnosticCollection
) {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(
      vscode.window.activeTextEditor.document,
      diagnosticCollection
    );
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        refreshDiagnostics(editor.document, diagnosticCollection);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      refreshDiagnostics(e.document, diagnosticCollection);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnosticCollection.delete(document.uri);
      documentDiagnosticCache.delete(document.uri.toString());
    })
  );
}

function refreshDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
): void {
  if (document.languageId !== "go") {
    return;
  }

  const cacheKey = document.uri.toString();

  // Return from cache if document and version matches.
  const cachedEntry = documentDiagnosticCache.get(cacheKey);
  if (cachedEntry && cachedEntry.version === document.version) {
    collection.set(document.uri, cachedEntry.diagnostics);
    return;
  }

  const configRegex = vscode.workspace
    .getConfiguration("lintInlineSQLInGo")
    .get<string>("sqlRegex");
  const regex = configRegex ? new RegExp(configRegex, "g") : /`([^`]*)`/g;

  const text = document.getText();

  let diagnostics: vscode.Diagnostic[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const query = match[1];

    let queryAST: Statement | undefined;
    let parseError: SQLError | undefined;
    try {
      queryAST = parseFirst(query);

      parseError = checkSemanticErrors(queryAST);
    } catch (e) {
      if (e instanceof Error) {
        parseError = {
          message: e.message,
          type: SQLErrorType.Syntax,
        };
      }
    }

    if (parseError) {
      const diagnostic = createSQLDiagnostic(document, match, parseError);
      diagnostics.push(diagnostic);
    }
  }

  // Save the new version of diagnostics.
  documentDiagnosticCache.set(cacheKey, {
    version: document.version,
    diagnostics,
  });

  collection.set(document.uri, diagnostics);
}
