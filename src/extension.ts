import * as vscode from 'vscode';
import { updateActivity, startSetup, noApiKey, sbUpdate } from './util';
import throttle from 'lodash-es/throttle';

let config = vscode.workspace.getConfiguration('japi');

const statusBarIcon = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
sbUpdate('init', statusBarIcon);

let listeners: {dispose():any}[] = [];

function sendActivity() { updateActivity(config, statusBarIcon); };

function cleanUp() {
  listeners.forEach((listener) => listener.dispose());
  listeners = [];
}

export function activate(context: vscode.ExtensionContext) {
	statusBarIcon.show();
  if(!config.get('api.token')) {noApiKey(statusBarIcon);}
  else {setTimeout(() => sbUpdate('success', statusBarIcon), 1500);}
  

  let data = [
    { command: "configure", res: () => startSetup(config, statusBarIcon) },
    { command: "statusbar.show", res: () => statusBarIcon.show() },
    { command: "statusbar.hide", res: () => statusBarIcon.hide() },
    { command: "presence.send", res: () => sendActivity() },
  ];
  for (let { command, res } of data) {context.subscriptions.push(vscode.commands.registerCommand(`japi.${command}`, res));}

  const onChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(() => sendActivity());
  const onChangeTextDocument = vscode.workspace.onDidChangeTextDocument(throttle(() => sendActivity(), 2000));
  const onStartDebugSession = vscode.debug.onDidStartDebugSession(() => sendActivity());
  const onTerminateDebugSession = vscode.debug.onDidTerminateDebugSession(() => sendActivity());

  listeners.push(onChangeActiveTextEditor, onChangeTextDocument, onStartDebugSession, onTerminateDebugSession);
}

export function deactivate() {
  cleanUp();
}