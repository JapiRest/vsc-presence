# JAPI Presence

## About

JAPI Presence is a VSCode extension that allows you to access the current file, line, column, and more from [JAPI](https://docs.japi.rest). This works like the popular [Discord Presence](https://marketplace.visualstudio.com/items?itemName=icrawl.discord-vscode) extension but instead it makes the data accessable from the JAPI API.

**IMPORTANT:** Please read our documentation on JAPI Presence [here](https://docs.japi.rest/#japi-presence) to learn more about how to use this extension to it's full potential.

## Quick Start

1. Go to <https://key.japi.rest> and create a new API Key.
2. `CTRL/CMD + SHFT + P` and run `JAPI: Configure` and paste your newly created API Key.
3. Check your status bar and wait for the extension to connect to JAPI.
4. In the JAPI key registry copy your identifier and go to <https://japi.rest/presence/v1/get?id=:identifier>
5. Use the API route wherever you want!

## Extension Settings

This extension contributes the following settings:

* `japi.api.token`: Create a key at [JAPI Key Registry](https://key.japi.rest) and then paste it into this config key to make it functional.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of JAPI Presence