import { TextEditor } from "vscode";
import { Decoration, renderDecorations, TextType } from "./decoration";
import { getRenderRangeFromTop } from "./renderRange";

const PANEL_CONTENT_WIDTH = 196;

function borderText(innerLines: number) {
  const horizontal = "─".repeat(PANEL_CONTENT_WIDTH + 2);
  const middle = `│${" ".repeat(PANEL_CONTENT_WIDTH + 2)}│`;
  return [
    `┌${horizontal}┐`,
    ...new Array(innerLines).fill(middle),
    `└${horizontal}┘`,
  ].join("\n");
}

function shiftDecoForFramedPanel(deco: Decoration): Decoration {
  if (deco.type === "text") {
    return {
      ...deco,
      lineOffset: (deco.lineOffset ?? 0) + 1,
      charOffset: (deco.charOffset ?? 0) + 2,
    };
  }
  return {
    ...deco,
    lineOffset: (deco.lineOffset ?? 0) + 1,
    charOffset: (deco.charOffset ?? 0) + 1,
  };
}

/**
 * A text layer to render at a specific position.
 */
export type TextLayer = {
  text: string;
  foreground: TextType;
  /** Character offset from left (default: 0) */
  charOffset?: number;
};

/**
 * Represents a single display row in the list panel.
 * Each row can have multiple text layers that render on top of each other.
 */
export type ListPanelRow = {
  /** Text layers to render on this row (rendered in order, later layers on top) */
  textLayers: TextLayer[];
};

/**
 * Configuration for rendering a list panel.
 */
export type ListPanelConfig = {
  /** Header text (usually "count  Title") */
  header: string;
  /** Decorations for the input line (line 1) */
  inputDecos: Decoration[];
  /** Rows to render starting at line 2 (can be items, descriptions, etc.) */
  rows: ListPanelRow[];
  /** Index of the selected row (0-based, relative to rows array). Use -1 for input line selection. */
  selectedRow?: number;
};

/**
 * Renders a list panel with the standard layout:
 *
 *   -------- top border --------
 *   header (line 0)
 *   input line (line 1)
 *   row 0 (line 2)
 *   row 1 (line 3)
 *   ...
 *   -------- bottom border --------
 *
 * Returns disposable decoration types that must be disposed by the caller.
 */
export function renderListPanel(
  editor: TextEditor,
  config: ListPanelConfig,
): ReturnType<typeof renderDecorations> {
  const { header, inputDecos, rows, selectedRow } = config;
  const rowCount = rows.length;
  const innerLines = rowCount + 2; // header + input + rows

  const decos: Decoration[] = [
    // frame
    {
      type: "text",
      text: borderText(innerLines),
      foreground: "dim",
    },
    // overall background
    {
      type: "background",
      lines: innerLines,
      lineOffset: 1,
      charOffset: 1,
      width: PANEL_CONTENT_WIDTH + 2,
    },
    // header
    {
      type: "text",
      text: header,
      foreground: "binding",
      lineOffset: 1,
      charOffset: 2,
    },
    // input line decorations
    ...inputDecos.map(shiftDecoForFramedPanel),
  ];

  // Selection highlight (selectedRow === -1 means input line is selected)
  if (selectedRow !== undefined) {
    const lineOffset = selectedRow === -1 ? 2 : selectedRow + 3;
    decos.push({
      type: "background",
      background: "header",
      lines: 1,
      lineOffset,
      charOffset: 1,
      width: PANEL_CONTENT_WIDTH + 2,
      zOffset: 1,
    });
  }

  // Render rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineOffset = i + 2;

    // Text layers
    for (const layer of row.textLayers) {
      decos.push({
        type: "text",
        text: layer.text,
        foreground: layer.foreground,
        lineOffset: lineOffset + 1,
        charOffset: (layer.charOffset ?? 0) + 2,
      });
    }
  }

  const range = getRenderRangeFromTop(editor, rowCount + 3);
  return renderDecorations(decos, editor, range);
}

/**
 * Helper to create text layers for a fuzzy-matched item.
 * Splits text into non-highlighted and highlighted parts.
 */
export function createFuzzyMatchLayers(
  text: string,
  positions: Set<number>,
  baseForeground: TextType = "command",
): TextLayer[] {
  const nonHighlight = [...text]
    .map((c, i) => (positions.has(i) ? " " : c))
    .join("");
  const highlight = [...text]
    .map((c, i) => (positions.has(i) ? c : " "))
    .join("");

  return [
    { text: nonHighlight, foreground: baseForeground },
    { text: highlight, foreground: "highlight" },
  ];
}
