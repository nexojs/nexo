import {
  Application,
  Router,
  send,
  join,
  Sha1,
  exists,
  basename,
  extname,
  relative,
  move,
} from "./deps.js";
import { HotFs } from "./hotfs.ts";
import { stripAnsi } from "./stripAnsi.js";
import { render } from "./ssr.ts";
import * as DevMiddleware from "./devMiddleware.ts";
export * from "./ssr.ts";

export interface Ctx {
  app: Application;
  router: Router;
  render: Function;
  files: Function;
  client: Record<string, { path: string; html: string }>;
}

export const nexo = async function ({
  port = 8000,
  hot = true,
  hotImport,
  boot,
  staticDir = join(Deno.cwd(), "public"),
  libDir = join(Deno.cwd(), "lib"),
}: {
  port?: number;
  hot?: boolean;
  hotImport?: (m: any) => Promise<any>;
  staticDir?: string;
  libDir?: string;
  boot: Function;
}) {
  let abortController: AbortController;
  let listener: Promise<any>;

  const hotfs = new HotFs({
    dir: libDir,
    hotPrefix: "hot",
    onReload: async function () {
      await initApp();
    },
  });
  hot = !!hotImport && hot;
  if (hot) {
    await hotfs.init();
  }

  const devMiddleware = DevMiddleware.create();

  const nexoDevCode = !hot ? "" : `
<script>
  ${devMiddleware.clientCode}
</script>`;

  const nextDistDir = join(staticDir, ".nexo-next");
  const distDir = join(staticDir, ".nexo");

  const publishNextClientBundle = async function () {
    if (await exists(nextDistDir)) {
      await Deno.remove(distDir, { recursive: true });
    }
    await move(nextDistDir, distDir);
  };

  const prepareNextClientBundle = async function () {
    const clientDir = join((hot ? hotfs.getHotDir() : libDir), "client");
    if (!await exists(clientDir)) {
      return {};
    }

    if (await exists(nextDistDir)) {
      await Deno.remove(nextDistDir, {
        recursive: true,
      });
    }
    await Deno.mkdir(nextDistDir);

    let nextDevCode = nexoDevCode;

    const result: Ctx["client"] = {};

    for await (const dirEntry of Deno.readDir(clientDir)) {
      const abs = join(clientDir, dirEntry.name);
      const [diag, out] = await Deno.bundle(abs, undefined, {
        jsxFactory: "h",
      });
      if (diag) {
        for (const diagItem of diag) {
          console.error(diagItem);
          nextDevCode +=
            `<script>console.error('Error while bundling "${dirEntry.name}"', ${
              JSON.stringify(diagItem)
            })</script>`;
        }
      }
      if (out) {
        let fileHash = "";
        if (!hot) {
          const sha1 = new Sha1();
          sha1.update(out);
          fileHash += "." + sha1;
        }

        const ext = extname(dirEntry.name);
        const base = basename(dirEntry.name, ext);
        const bundleName = `${base}${fileHash}.js`;

        await Deno.writeTextFile(join(nextDistDir, bundleName), out);

        const browserPath = "/" +
          relative(staticDir, join(distDir, bundleName));
        result[base] = {
          path: browserPath,
          html: `<script type="module" src="${browserPath}"></script>`,
        };
      }
    }

    result.nexoDev = {
      path: "",
      html: nextDevCode,
    };

    return result;
  };

  const fileMiddleware = async (context: any, next: any) => {
    const filePath = join(staticDir, context.request.url.pathname);

    if (!await exists(filePath)) {
      return await next();
    }

    await send(context, context.request.url.pathname, {
      root: staticDir,
      index: "index.html",
    });
  };

  const initApp = async function () {
    await Deno.mkdir(staticDir, { recursive: true });
    const client = await prepareNextClientBundle();

    const app = new Application();
    const router = new Router();

    if (hot) {
      app.use(devMiddleware.middleware);
    }

    const renderWithCtx = function (createSections: Function, tpl?: any) {
      return render(ctx, createSections, tpl);
    };

    const ctx: Ctx = {
      client,
      app,
      render: renderWithCtx,
      router,
      files: fileMiddleware,
    };

    try {
      if (hot && hotImport) {
        const hotDir = hotfs.getHotDir();
        const importPath = join(hotDir, "boot.tsx");

        const imports = await hotImport(importPath);
        await imports.default(ctx);
      } else {
        await boot(ctx);
      }
    } catch (err) {
      console.error(err);
      app.use(function (ctx) {
        ctx.response.body = `
<html>
  <body>
    ${nexoDevCode}
    <pre>${stripAnsi(err.message).trim()}</pre>
  </body>
</html>`;
        ctx.response.status = 500;
      });
    }

    const restart = abortController && listener;
    if (restart) {
      await devMiddleware.sendReload();

      abortController.abort();
      await listener;
    }

    abortController = new AbortController();
    listener = app.listen({
      port,
      signal: abortController.signal,
    });
    await publishNextClientBundle();

    console.log(`Nexo ${restart ? "re" : ""}started`);
  };

  await initApp();
  if (hot) {
    hotfs.initWatch();
  }
};
