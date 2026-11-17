import { z } from 'zod';

/** What an agent sends to show a component in Component Code. */
export const PreviewInput = z.object({
  source: z
    .string()
    .describe(
      "The component's module in TSX. It may import only from 'react'. Its exports, the default one by its function's name, are what `code` can name. For each value the reader can change by using the component, such as `checked`, `open` or `value`, take a matching `onCheckedChange`, `onOpenChange` or `onValueChange` prop and call it with the new value. Component Code passes it, so the change shows in the code. Keep state of its own only for when the prop is missing.",
    ),
  code: z
    .string()
    .describe(
      'How the component is used, in JSX: elements, props and text only, with no hooks, calls or conditions. It is shown as code and rendered as the preview. Each string, number and boolean in it becomes a control.',
    ),
  file: z
    .string()
    .optional()
    .describe("The file named in the code's tab, such as `Card.tsx`."),
  controls: z
    .record(
      z.string(),
      z.union([
        z.literal(false),
        z.array(z.union([z.string(), z.number()])),
        z.object({
          min: z.number().optional(),
          max: z.number().optional(),
          step: z.number().optional(),
        }),
      ]),
    )
    .optional()
    .describe(
      'How a prop is changed, by its name or by `Element.prop`: a list of options, `{ min, max, step }` for a number, or `false` to keep it as written.',
    ),
});

export type PreviewInput = z.infer<typeof PreviewInput>;

/** What an agent sends to show HTML, CSS and JS in Component Code. */
export const PageInput = z.object({
  files: z
    .record(z.string(), z.string())
    .describe(
      "The files by name, such as `index.html`, `style.css` and `script.js`, each in its own tab. They run together as one page in a sandboxed frame: the HTML is the page's body, with the CSS in a style element and the JS in a script element after it. The page cannot load anything from the network, so draw with canvas, SVG or the DOM.",
    ),
  controls: z
    .record(
      z.string(),
      z.union([
        z.literal(true),
        z.array(z.union([z.string(), z.number()])),
        z.object({
          min: z.number().optional(),
          max: z.number().optional(),
          step: z.number().optional(),
        }),
      ]),
    )
    .optional()
    .describe(
      'The values the reader can change, by name: an attribute, as `r` or `circle.r`, a CSS property or custom property, as `--speed`, or a JS `const` set to a number, string or boolean. Each takes `true`, a list of options, or `{ min, max, step }` for a number. CSS changes apply as the reader drags, while HTML and JS run the page again, so a script that reads custom properties each frame follows along.',
    ),
});

export type PageInput = z.infer<typeof PageInput>;
