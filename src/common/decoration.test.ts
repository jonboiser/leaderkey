jest.mock("vscode", () => {
  const createTextEditorDecorationType = jest.fn((opts) => ({
    opts,
    dispose: jest.fn(),
  }));

  return {
    window: {
      createTextEditorDecorationType,
    },
    workspace: {
      getConfiguration: jest.fn(() => ({
        get: (_key: string, fallback: unknown) => fallback,
      })),
    },
    ThemeColor: class ThemeColor {
      id: string;
      constructor(id: string) {
        this.id = id;
      }
    },
  };
});

import { window } from "vscode";
import { renderDecorations, resolveBackground, resolveText } from "./decoration";

describe("decoration theme resolver", () => {
  test("resolves background token fallbacks in order", () => {
    expect(resolveBackground("default")).toBe(
      "var(--vscode-editorHoverWidget-background, var(--vscode-editorWidget-background, var(--vscode-editor-background)))",
    );
    expect(resolveBackground("border")).toBe(
      "var(--vscode-editorHoverWidget-border, var(--vscode-editorWidget-border, var(--vscode-contrastBorder)))",
    );
  });

  test("resolves text token fallbacks and preserves font weights", () => {
    expect(resolveText("command")).toEqual({
      color:
        "var(--vscode-editorHoverWidget-foreground, var(--vscode-editor-foreground))",
    });

    expect(resolveText("key")).toEqual({
      color:
        "var(--vscode-textLink-foreground, var(--vscode-editorHoverWidget-foreground, var(--vscode-editor-foreground)))",
      fontWeight: "bold",
    });

    expect(resolveText("error-bold")).toEqual({
      color: "var(--vscode-errorForeground)",
      fontWeight: "bold",
    });
  });
});

describe("renderDecorations", () => {
  test("uses tokenized foreground/background colors", () => {
    const editor = {
      setDecorations: jest.fn(),
    } as any;

    const range = {} as any;

    const dts = renderDecorations(
      [
        { type: "background", background: "header", lines: 2 },
        { type: "text", foreground: "binding", text: "abc" },
      ],
      editor,
      range,
    );

    expect(dts).toHaveLength(2);
    const create = (window.createTextEditorDecorationType as jest.Mock).mock;
    expect(create.calls).toHaveLength(2);

    expect(create.calls[0][0].before.backgroundColor).toBe(
      "var(--vscode-editorHoverWidget-statusBarBackground, var(--vscode-editorHoverWidget-background, var(--vscode-editorWidget-background)))",
    );
    expect(create.calls[1][0].before.color).toBe(
      "var(--vscode-textLink-foreground, var(--vscode-editorHoverWidget-foreground, var(--vscode-editor-foreground)))",
    );
    expect(editor.setDecorations).toHaveBeenCalledTimes(2);
  });
});
