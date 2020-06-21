import {
  filterOutUnusedRules,
  getStyleTag,
  VirtualInjector,
  setup,
} from "./deps.ts";

export const pageHtml = function ({
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

export const renderPage = function (
  ctx: any,
  createSections: Function,
  tpl = pageHtml,
) {
  const injectCss = pageCss();

  const sections = createSections(ctx);
  sections.body = sections.body || "";
  sections.body = ctx.client.nexoDev.html + sections.body;

  return injectCss(tpl(sections));
};

export const pageCss = function () {
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
