import * as vscode from 'vscode';
import * as path from 'path';
import fetch from 'node-fetch';
import * as constants from './constants';
import { API, GitExtension } from './git';

let git: API | null | undefined;

export function sbUpdate(type = 'success', statusBar: vscode.StatusBarItem) {
  switch (type.toLowerCase()) {
    case 'init': {
      statusBar.text = '$(pulse) JAPI Initializing';
    } break;

    case 'success': {
      statusBar.text = '$(code) JAPI';
      statusBar.tooltip = 'Connected to JAPI. Click to hide bar icon.';
      statusBar.command = 'japi.statusbar.hide';
    } break;

    case 'missingkey': {
      statusBar.text = '$(pulse) Missing JAPI Key';
      statusBar.tooltip = 'Setup API Key';
      statusBar.command = 'japi.configure';
    } break;

    case 'awaitkey': {
      statusBar.text = '$(beaker) Awaiting API Key';
      statusBar.tooltip = 'Configure Key';
      statusBar.command = 'japi.configure';
    } break;

    case 'invalidkey': {
      statusBar.text = '$(warning) JAPI Key Invalid';
      statusBar.tooltip = 'Configure Key';
      statusBar.command = 'japi.configure';
    } break;

    default:
      break;
  }
}

export async function updateActivity (config: vscode.WorkspaceConfiguration, statusBar: vscode.StatusBarItem) {
  const window = vscode.window;
  if(window.activeTextEditor) {
    const document = window.activeTextEditor.document;
    const selection = window.activeTextEditor.selection;

    let fileSize;
    try {
      fileSize = await vscode.workspace.fs.stat(document.uri);
    } catch (err) {
      fileSize = document.getText().length;
    }
    try {
      const git = await getGit();
      let gitLink, gitBranch;
      if(git && git.repositories && git.repositories.length) {
        const selectedRepo = git.repositories.find((repo) => repo.ui.selected);
        gitLink = git.repositories.find((repo) => repo.ui.selected)?.state.HEAD?.name ?? null;
        gitBranch = git.repositories.find((repo) => repo.ui.selected)?.state.remotes[0].fetchUrl?.split('/')[1].replace('.git', '') ?? null;
      } else {
        gitLink = 'Unknown';
        gitBranch = 'Unknown';
      }

      const data = {
        sessionType: vscode.debug.activeDebugSession ? 'vscode-debug' : vscode.env.appName.includes('Insiders') ? 'vscode-insiders' : 'vscode',
        workspaceFolder: vscode.workspace.getWorkspaceFolder(document.uri)?.name,
        file: {
          path: document.fileName,
          name: path.basename(document.fileName),
          size: fileSize,
          totalLines: document.lineCount.toLocaleString(),
          currentLine: (selection.active.line + 1).toLocaleString(),
          currentColumn: (selection.active.character + 1).toLocaleString(),
        },
        git: {
          link: gitLink,
          branch: gitBranch,
        },
      };

      const resp = await fetch(`${constants.baseUrl}send`, { method: 'POST', headers: { 'content-Type': 'application/json', 'authorization': String(config.get('api.token')) }, body: JSON.stringify(data) }).then((resp) => resp.json());
      if (resp.status === 200) { sbUpdate('success', statusBar); }
      else if (resp.status === 403) { sbUpdate('invalidkey', statusBar); }
    } catch (e) {
      console.error(e);
    }
  }
}

export async function getGit() {
	if (git || git === null) {
		return git;
	}
	try {
		const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
		if (!gitExtension?.isActive) {
			await gitExtension?.activate();
		}
		git = gitExtension?.exports.getAPI(1);
	} catch (error) {
		git = null;
	}

	return git;
}

export async function startSetup (config: vscode.WorkspaceConfiguration, statusBar: vscode.StatusBarItem) {
  let token = await vscode.window.showInputBox({ title: 'Enter your JAPI key.', placeHolder: 'API Key' });
  sbUpdate('awaitkey', statusBar);
  if (!token || !constants.keyRegex.test(token)) {
    sbUpdate('invalidkey', statusBar);
    const tryAgain = await vscode.window.showWarningMessage('Invalid API Token provided, please try again.', 'Try Again', 'I give up');
    if (tryAgain === 'Try Again') {vscode.commands.executeCommand('japi.configure');}
    return false;
  }
  if (constants.keyRegex.test(token)) {
    await config.update('api.token', token);
    vscode.commands.executeCommand('japi.presence.send');
    return true;
  }
}

export async function noApiKey (statusBarIcon: vscode.StatusBarItem) {
  sbUpdate('missingkey', statusBarIcon);
  const wantSetup = await vscode.window.showInformationMessage('Would you like to configure JAPI?', 'Yes', 'No');
  if (wantSetup === 'Yes') { vscode.commands.executeCommand('japi.configure'); }
}