# Compact editing in VS Code

Checked on 24 October 2026. An editor extension is installed in VS Code, not
through this project's package.json. Syntax highlighting colors code;
completion suggests names; diagnostics report errors. They are distinct features.

## Official extension

Midnight distributes a Compact extension as a VSIX in its
[official release repository](https://github.com/midnightntwrk/releases/tree/gh-pages/artifacts/vscode-extension).
The newest directory there when checked was compact-0.2.13. This is the
extension's version, not compiler 0.31.1 or language 0.23.
The current Midnight build guide promises syntax highlighting; do not assume
that this provides the full IntelliSense experience available for TypeScript.

Download the .vsix from the release directory. In VS Code press Cmd+Shift+P,
choose **Extensions: Install from VSIX...**, select the download and reload.

## Completion and live diagnostics: a community option

[Nite Compact Language Server](https://github.com/nite-framework/nite-compact-language-vsc-extension)
advertises completions, hover information and diagnostics backed by the installed
Compact compiler. It is community-maintained, not the official Midnight extension.

1. Open [its Open VSX listing](https://open-vsx.org/extension/codebigint/nite-compact).
   The verified published version is 0.2.2. Download its VSIX; the extension ID
   is `codebigint.nite-compact`.
2. In VS Code, Cmd+Shift+P → **Extensions: Install from VSIX...** → select it.
3. If the official `midnightnetwork.compact` extension is enabled, disable it
   for this workspace while using Nite. Its maintainer warns that the two
   language registrations can conflict.
4. Open this project's folder in VS Code. In **Preferences: Open Workspace
   Settings (JSON)**, merge these fields into any existing settings:

```json
{
  "niteCompact.compactPath": "/absolute/path/to/compact",
  "niteCompact.toolchainVersion": "0.31.1",
  "niteCompact.compileMode": "onSave"
}
```

Replace `/absolute/path/to/compact` with the output of `command -v compact`.
The version selects the same compiler as your npm script. onSave checks when
you save rather than repeatedly while you type. No compiler upgrade is needed.

5. Run **Developer: Reload Window** from the Command Palette. Open `Lessons/Lesson 02/Exercise/hello.compact`;
   the bottom-right language mode should say Compact. If it says Plain Text,
   click it and select Compact.
6. Type part of a keyword and use **Trigger Suggest** from the Command Palette
   (or Ctrl+Space if macOS has not reserved that shortcut). Hover over a type.
7. Temporarily misspell a name, save, and inspect the Problems panel. Undo it.
   If diagnostics do not appear, try **Nite Compact: Check Current File Now**
   and inspect VS Code's Output panel for the extension's errors.

These are documented capabilities, not a guarantee of complete TypeScript-like
semantic completion for every Compact expression. Continue to compile explicitly
with `npm run compile-compact`. Use these steps to verify the extension in the editor; successful compiler
execution remains the authoritative check for this project.
