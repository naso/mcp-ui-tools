/** A value the reader changed, the code it left, and what the preview threw. */
export type Change = {
  prop: string;
  value: string | number | boolean;
  /** The files as they now are, by name. */
  files: Readonly<Record<string, string>>;
  /** The file the value is in. */
  file: string;
  /** What the preview shows in place of the component, if it threw. */
  problem?: string;
};

const LANGUAGES: Record<string, string> = {
  tsx: 'tsx',
  jsx: 'jsx',
  ts: 'ts',
  js: 'js',
  html: 'html',
  css: 'css',
};

const fence = (name: string, code: string) => {
  const extension = name.split('.').pop() ?? '';
  return `\`${name}\`\n\n\`\`\`${LANGUAGES[extension] ?? ''}\n${code}\n\`\`\``;
};

/**
 * What the model reads with the user's next message: the value they changed,
 * the code exactly as it now is, which is the whole state, and what broke.
 */
export function describe({ prop, value, files, file, problem }: Change) {
  const shown = typeof value === 'string' ? JSON.stringify(value) : `${value}`;
  return [
    `In Component Code, the user set \`${prop}\` to \`${shown}\` in \`${file}\`. The preview now runs this code, which is its whole state:`,
    ...Object.entries(files).map(([name, code]) => fence(name, code)),
    problem
      ? `The preview throws instead of rendering: ${problem}`
      : 'The preview renders without throwing.',
  ].join('\n\n');
}
