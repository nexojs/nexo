import { Application, Router, render, send, join, Sha1, exists, basename, extname, writeFileStr, relative } from "./deps.js";
import { HotFs } from "./hotfs.ts";

export interface Ctx {
  app: Application,
  router: Router,
  render: typeof render,
  files: Function,
  client: Record<string, { path: string, html: string }>
}

export const nexo = async function({
  port = 8000,
  watch = true,
  boot,
  staticDir = join(Deno.cwd(), 'public'),
  libDir = join(Deno.cwd(), 'lib')
}: {
  port?: number,
  watch?: boolean,
  staticDir?: string,
  libDir?: string,
  boot: Function
}) {
  let abortController: AbortController;

  const serverRef: { current?: any } = {};

  const hotfs = new HotFs({
    dir: libDir,
    hotPrefix: "hot",
    onReload: function () {
      initApp();
    }
  });

  if (watch) {
    await hotfs.init();
  }

  const bundleClient = async function() {
    const clientDir = join((watch ? hotfs.getHotDir(): libDir), 'client')
    if (!await exists(clientDir)) {
      return {};
    }

    const distDir = join(staticDir, '.nexo');
    if (await exists(distDir)) {
      await Deno.remove(distDir, {
        recursive: true
      })
    }
    await Deno.mkdir(distDir)

    const result: Ctx['client'] = {}
    
    for await (const dirEntry of Deno.readDir(clientDir)) {
      const abs = join(clientDir, dirEntry.name);
      const [diag, out] = await Deno.bundle(abs, undefined, {
        jsxFactory: 'h'
      })
      if (diag) {
        for (const diagItem of diag) {
          console.log(diagItem);
        }
      }
      if (out) {
        const sha1 = new Sha1();
        sha1.update(out);

        const ext = extname(dirEntry.name);
        const base = basename(dirEntry.name, ext)
        const staticName = join(distDir, `${base}.${sha1}.js`)
        await writeFileStr(staticName, out);

        const browserPath = '/' + relative(staticDir, staticName);
        result[base] = { path: browserPath, html: `<script type="module" src="${browserPath}"></script>` }
      }
    }

    return result;
  }

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
    await Deno.mkdir(staticDir, { recursive: true })
    const client = await bundleClient();

    const restart = !!serverRef.current;

    if (abortController) {
      abortController.abort();
    }

    if (restart) {
      serverRef.current.close();
      delete serverRef.current;
    }

    abortController = new AbortController();
    const app = new Application();
    const router = new Router();

    const ctx: Ctx = {
      client,
      app,
      render,
      router,
      files: fileMiddleware
    };

    if (watch) {
      const hotDir = hotfs.getHotDir();
      const importPath = join(hotDir, 'boot.tsx')

      try {
        const imports = await import(importPath);
        await imports.default(ctx);
      } catch (err) {
        console.error(err);
      }
    } else {
      boot(ctx);
    }
    

    app.listen({
      port,
      signal: abortController.signal,
    }, serverRef);

    console.log(`Nexo ${restart ? 're':''}started`);
  };

  initApp();
}

