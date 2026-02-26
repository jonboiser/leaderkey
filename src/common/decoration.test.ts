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
  test("resolves background tokens", () => {
    expect((resolveBackground("default") as any).id).toBe("editorHoverWidget.background");
    expect((resolveBackground("border") as any).id).toBe("editorHoverWidget.border");
  });

  test("resolves text tokens and preserves font weights", () => {
    expect(resolveText("command")).toEqual({
      color: { id: "editorHoverWidget.foreground" },
    });

    expect(resolveText("key")).toEqual({
      color: { id: "symbolIcon.typeParameterForeground" },
      fontWeight: "bold",
    });

    expect(resolveText("error-bold")).toEqual({
      color: { id: "errorForeground" },
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

    expect(create.calls[0][0].before.backgroundColor).toEqual({
      id: "editorHoverWidget.statusBarBackground",
    });
    expect(create.calls[1][0].before.color).toEqual({ id: "list.highlightForeground" });
    expect(editor.setDecorations).toHaveBeenCalledTimes(2);
  });
});
