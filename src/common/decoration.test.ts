jest.mock("vscode", () => {
  let keyForeground = "";
  const createTextEditorDecorationType = jest.fn((opts) => ({
    opts,
    dispose: jest.fn(),
  }));

  return {
    window: {
      createTextEditorDecorationType,
    },
    workspace: {
      getConfiguration: jest.fn((section?: string) => ({
        get: (key: string, fallback: unknown) => {
          if (section === "leaderkey.theme" && key === "keyForeground") {
            return keyForeground;
          }
          return fallback;
        },
      })),
    },
    ThemeColor: class ThemeColor {
      id: string;
      constructor(id: string) {
        this.id = id;
      }
    },
    __setKeyForeground: (value: string) => {
      keyForeground = value;
    },
  };
});

import { window } from "vscode";
import { renderDecorations, resolveBackground, resolveText } from "./decoration";
const { __setKeyForeground } = jest.requireMock("vscode");

describe("decoration theme resolver", () => {
  beforeEach(() => {
    __setKeyForeground("");
  });

  test("resolves background tokens", () => {
    expect((resolveBackground("default") as any).id).toBe("editorHoverWidget.background");
    expect((resolveBackground("border") as any).id).toBe("editorHoverWidget.border");
  });

  test("resolves text tokens and preserves font weights", () => {
    expect(resolveText("command")).toEqual({
      color: { id: "editorHoverWidget.foreground" },
    });

    expect(resolveText("key")).toEqual({
      color: { id: "symbolIcon.classForeground" },
      fontWeight: "bold",
    });

    expect(resolveText("error-bold")).toEqual({
      color: { id: "errorForeground" },
      fontWeight: "bold",
    });
  });

  test("supports key color override from config token id or literal color", () => {
    __setKeyForeground("symbolIcon.interfaceForeground");
    expect(resolveText("key")).toEqual({
      color: { id: "symbolIcon.interfaceForeground" },
      fontWeight: "bold",
    });

    __setKeyForeground("#859900");
    expect(resolveText("key")).toEqual({
      color: "#859900",
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
