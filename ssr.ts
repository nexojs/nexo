import { setup, css as css_ } from "./otion.js";
import { filterOutUnusedRules, getStyleTag, VirtualInjector } from "./deps.js";
import { render as preactRender } from "./deps.js";

export const jsx = preactRender;

export const html = function ({
  head = "",
  title = "",
  body = "",
  bodyAttrs = "",
}) {
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${title ? `<title>${title}</title>` : ""}
    ${head}
  </head>
  <body ${bodyAttrs}>
    ${body}
  </body>
</html>`;
};

export const render = function (
  ctx: any,
  createSections: Function,
  tpl = html,
) {
  const injectCss = css();

  const sections = createSections(ctx);
  sections.body = sections.body || "";
  sections.body = ctx.client.nexoDev.html + sections.body;

  return injectCss(tpl(sections));
};

export const css = function () {
  const sharedOptions = {};
  const injector = VirtualInjector();

  // Shall be called before the underlying page is rendered
  setup({ injector });

  return function (html: string) {
    const styleTag = getStyleTag(filterOutUnusedRules(injector, html));
    html = html.replace("</head>", styleTag + "</head>");

    return html;
  };
};
