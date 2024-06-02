import * as vscode from "vscode";
import { subscribeSQlDiagnostic } from "./diagonistic/sqlDiagnostic";

export function activate(context: vscode.ExtensionContext) {
  const sqlDiagnosticCollection =
    vscode.languages.createDiagnosticCollection("inlineSQL");
  context.subscriptions.push(sqlDiagnosticCollection);

  subscribeSQlDiagnostic(context, sqlDiagnosticCollection);
}

export function deactivate() {}
