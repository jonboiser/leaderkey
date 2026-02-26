import {
  Range,
  TextEditor,
  ThemableDecorationAttachmentRenderOptions,
  ThemeColor,
  window,
  workspace,
} from "vscode";
import { TokenType } from "../leaderkey/command";

export type ColorRef = ThemeColor | string;

export let stickyScrollMaxRows: number = 0;
export function updateStickyScrollConf() {
  const ss = workspace.getConfiguration("editor.stickyScroll");
  if (ss.get("enabled") === true) {
    stickyScrollMaxRows = ss.get("maxLineCount", 5);
  } else {
    stickyScrollMaxRows = 0;
  }
}
updateStickyScrollConf();

export type BackgroundRole = "default" | "header" | "border" | "cursor" | "gray";
type BackgroundType = BackgroundRole;

export type TextType =
  | TokenType
  | "dir"
  | "highlight"
  | "arrow-bold"
  | "error-bold"
  | "dim"
  | "dimdim";

type TextRole = TextType;

const backgroundTokenFallbacks: Record<BackgroundRole, string[]> = {
  default: ["editorHoverWidget.background", "editorWidget.background", "editor.background"],
  header: [
    "editorHoverWidget.statusBarBackground",
    "editorHoverWidget.background",
    "editorWidget.background",
  ],
  border: ["editorHoverWidget.border", "editorWidget.border", "contrastBorder"],
  cursor: ["editorCursor.foreground", "editor.foreground"],
  gray: [
    "editor.selectionHighlightBackground",
    "editor.wordHighlightBackground",
    "list.inactiveSelectionBackground",
  ],
};

const textTokenFallbacks: Record<TextRole, string[]> = {
  command: ["editorHoverWidget.foreground", "editor.foreground"],
  key: ["textLink.foreground", "editorHoverWidget.foreground", "editor.foreground"],
  binding: ["textLink.foreground", "editorHoverWidget.foreground", "editor.foreground"],
  highlight: ["textLink.foreground", "editorHoverWidget.foreground", "editor.foreground"],
  dir: ["textLink.foreground", "editorHoverWidget.foreground", "editor.foreground"],
  arrow: ["descriptionForeground", "editorHoverWidget.foreground", "editor.foreground"],
  "arrow-bold": ["descriptionForeground", "editorHoverWidget.foreground", "editor.foreground"],
  dim: ["descriptionForeground", "editorHoverWidget.foreground", "editor.foreground"],
  dimdim: ["disabledForeground", "descriptionForeground", "editorHoverWidget.foreground"],
  "error-bold": ["errorForeground"],
};

const textStyleOpts: Partial<Record<TextRole, Pick<ThemableDecorationAttachmentRenderOptions, "fontWeight">>> = {
  key: { fontWeight: "bold" },
  "arrow-bold": { fontWeight: "bold" },
  highlight: { fontWeight: "bold" },
  "error-bold": { fontWeight: "bold" },
};

function tokenToCssVar(token: string) {
  return `--vscode-${token.replaceAll(".", "-")}`;
}

function cssVarFallback(tokens: string[]): string {
  if (tokens.length === 0) return "";
  let expr = `var(${tokenToCssVar(tokens[tokens.length - 1])})`;
  for (let i = tokens.length - 2; i >= 0; i--) {
    expr = `var(${tokenToCssVar(tokens[i])}, ${expr})`;
  }
  return expr;
}

export function resolveBackground(role: BackgroundRole): ColorRef {
  return cssVarFallback(backgroundTokenFallbacks[role]);
}

export function resolveText(role: TextRole): ThemableDecorationAttachmentRenderOptions {
  return {
    ...(textStyleOpts[role] ?? {}),
    color: cssVarFallback(textTokenFallbacks[role]),
  };
}

export type Decoration =
  | {
      type: "background";
      background?: BackgroundType;
      lines: number;
      width?: number;
      lineOffset?: number;
      charOffset?: number;
      zOffset?: number;
    }
  | {
      type: "text";
      background?: BackgroundType;
      foreground: TextType;
      lineOffset?: number;
      charOffset?: number;
      text: string;
      zOffset?: number;
    };

function escapeTextForBeforeContentText(text: string) {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll(" ", "\\00a0 ")
    .replace(/(\r\n|\r|\n)/g, " \\A ");
}

export function renderDecorations(
  decorations: Decoration[],
  editor: TextEditor,
  range: Range,
) {
  const dts = decorations.map((deco) => {
    switch (deco.type) {
      case "background":
        return window.createTextEditorDecorationType({
          color: "transparent",
          before: {
            contentText: "",
            backgroundColor: resolveBackground(deco.background ?? "default"),
            height: `${100 * deco.lines}%`,
            width: `${deco.width ?? 200}ch`,
            margin: `0 -1ch 0 ${deco.charOffset !== undefined ? 0.5 + deco.charOffset : 0}ch;
                position: absolute; z-index: ${100 + (deco.zOffset ?? 0)};
                ${deco.lineOffset === undefined ? "" : `top: ${deco.lineOffset * 100}%;`}`,
          },
        });
      case "text":
        return window.createTextEditorDecorationType({
          color: "transparent",
          before: {
            fontWeight: "normal",
            ...resolveText(deco.foreground),
            ...(deco.background === undefined
              ? {}
              : { backgroundColor: resolveBackground(deco.background) }),
            height: "100%",
            width: "200ch",
            margin: `0 -1ch 0 ${deco.charOffset ?? 0}ch; position: absolute; z-index: ${110 + (deco.zOffset ?? 0)}; padding-left: 0.5ch; white-space: pre;
               ${deco.lineOffset === undefined ? "" : `top: ${deco.lineOffset * 100}%;`}
               content: '${escapeTextForBeforeContentText(deco.text)}'`,
          },
        });
    }
  });
  dts.forEach((dt) => editor.setDecorations(dt, [range]));
  return dts;
}

export function getThemeRenderOpts(tokenType: TextType) {
  return resolveText(tokenType);
}
