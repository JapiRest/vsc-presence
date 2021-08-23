import * as vscode from 'vscode';
import * as path from 'path';
import fetch from 'node-fetch';
import * as constants from './constants';
import { API, GitExtension } from './git';

let git: API | null | undefined;

export function sbUpdate(type = 'success', statusBar: vscode.StatusBarItem, message?: string) {
  switch (type.toLowerCase()) {
    case 'init': {
      statusBar.text = '$(pulse) JAPI Initializing';
    } break;

    case 'success': {
      statusBar.text = '$(symbol-module) JAPI Connected';
      statusBar.tooltip = 'Connected to JAPI. Click to push latest status.';
      statusBar.command = 'japi.presence.send';
    } break;
    
    case 'error': {
      statusBar.text = '$(error) Error occurred';
      statusBar.tooltip = "This tooltip should've updated...";
      statusBar.command = 'japi.presence.send';
      statusBar.tooltip = message;
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

export async function updateActivity (config: vscode.WorkspaceConfiguration, statusBar: vscode.StatusBarItem, presenceVersion: string) {
  const window = vscode.window;
  if(window.activeTextEditor) {
    const document = window.activeTextEditor.document;
    const selection = window.activeTextEditor.selection;

    let fileSize: number;
    try {
      ({size: fileSize} = await vscode.workspace.fs.stat(document.uri));
    } catch (err) {
      fileSize = document.getText().length;
    }

    // File Size
    let currentDivision = 0;
    const originalSize = fileSize;
    if(originalSize > 1000) {
      fileSize /= 1000;
      currentDivision++;
      while(fileSize > 1000) {
        currentDivision++;
        fileSize /= 1000;
      }
    }

    try {
      // Github
      const git = await getGit();
      let gitRepoName, gitBranch;
      if(git?.repositories.length) {
        const selectedRepo = git.repositories.find((repo) => repo.ui.selected);
        gitBranch = selectedRepo?.state?.HEAD?.name ?? null;
        gitRepoName = selectedRepo?.state?.remotes[0]?.fetchUrl?.split('/')[1].replace('.git', '') ?? null;
      } else {
        gitRepoName = 'Unknown';
        gitBranch = 'Unknown';
      }

      const { dir } = path.parse(window.activeTextEditor.document.fileName);
      const split = dir.split(path.sep);
      const dirName = split[split.length - 1];
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
			
      const data = {
        presenceVersion: presenceVersion,
        sessionType: vscode.debug.activeDebugSession ? 'vscode-debug' : vscode.env.appName.includes('Insiders') ? 'vscode-insiders' : 'vscode',
        workspaceFolder: workspaceFolder?.name ?? null,
        dirName,
        file: {
          path: document.fileName,
          name: path.basename(document.fileName),
          extension: path.extname(document.fileName),
          extensionImage: constants.extensionImageURL + (path.extname(document.fileName)?.replace('.','') ? `file_type_${path.extname(document.fileName)?.replace('.','')}` : 'default_file') + '.svg',
          size: `${originalSize>1000?fileSize.toFixed(2):fileSize}${constants.fileSizes[currentDivision]}`,
          totalLines: document.lineCount.toLocaleString(),
          currentLine: (selection.active.line + 1).toLocaleString(),
          currentColumn: (selection.active.character + 1).toLocaleString(),
        },
        git: {
          repoName: gitRepoName,
          branch: gitBranch,
        },
      };

      const resp = await fetch(`${constants.baseUrl}send`, { method: 'POST', headers: { 'content-Type': 'application/json', 'authorization': String(config.get('api.token')) }, body: JSON.stringify(data) }).then((resp) => resp.json());
      if (resp.status === 200) { sbUpdate('success', statusBar); }
      else if (resp.status === 403) { sbUpdate('invalidkey', statusBar); }
    } catch (e) {
      sbUpdate('error', statusBar, e.message);
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