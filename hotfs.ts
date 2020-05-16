import { join, relative, copy, exists, move, signal } from "./deps.js";

let hotId = 0;

const HOT_FS_DEBUG = true;

const debounce = function (handler: any, timeout: number) {
  let timeoutId: number;

  return function () {
    if (timeoutId != null) clearTimeout(timeoutId);
    timeoutId = setTimeout(handler, timeout);
  };
};

export class HotFs {
  #dir: string;
  #hotPrefix: string;
  #onReload: Function;
  #hotDir = ''
  #debounce: number;

  constructor({
    dir,
    onReload,
    hotPrefix,
    debounce = 500,
  }: {
    dir: string;
    onReload: Function;
    hotPrefix: string;
    debounce?: number;
  }) {
    this.#hotPrefix = hotPrefix;
    this.#dir = dir;
    this.#debounce = debounce;
    this.#onReload = onReload;
  }

  async init() {
    await this._initFs();
    this._initCleanup();
    this._initWatcher();
  }

  _initCleanup() {
    const stopSignal = signal(
      Deno.Signal.SIGINT,
      Deno.Signal.SIGQUIT,
      Deno.Signal.SIGTERM,
    );
    setTimeout(async () => {
      for await (const _ of stopSignal) {
        console.log(`HotFs "${this.#hotDir}" cleanup`);
        await Deno.remove(this.#hotDir, { recursive: true });
        Deno.exit();
      }
    }, 0);
  }

  async _initFs() {
    this.#hotDir = this._nextHotDir();
    await copy(this.#dir, this.#hotDir);
  }

  _nextHotDir() {
    const newHotId = hotId++;
    const hotDir = `.${this.#hotPrefix}${newHotId}`;

    const abs = join(Deno.cwd(), hotDir);
    return abs;
  }

  async _initWatcher() {
    const onReload = debounce(this._onReload, this.#debounce);

    const watcher = Deno.watchFs([
      this.#dir,
    ]);
    for await (const event of watcher) {
      let reload = false;

      if (event.kind === "modify") {
        if (event.paths.length == 1) {
          reload = !!(reload || await this._removeFile(event.paths[0]));
        }

        if (event.paths.length == 2) {
          reload = !!(reload ||
            await this._renameFile(event.paths[0], event.paths[1]));
        }
      }

      if (event.kind === "remove") {
        reload = !!(reload || await this._removeFile(event.paths[0]));
      }

      if (event.kind === "access") {
        reload = !!(reload || await this._updateFile(event.paths[0]));
      }

      if (event.kind === "create") {
        reload = !!(reload || await this._updateFile(event.paths[0], true));
      }

      if (reload) {
        onReload();
      }
    }
  }

  _onReload = async () => {
    await this._invalidate();
    this.#onReload();
  };

  async _updateFile(fileName: string, create = false) {
    const stat = await Deno.stat(fileName);
    if (stat.isDirectory && !create) {
      return;
    }

    const relativePath = relative(this.#dir, fileName);
    const newPath = join(this.#hotDir, relativePath);

    if (stat.isDirectory) {
      await copy(fileName, newPath);
    } else {
      await Deno.copyFile(fileName, newPath);
    }

    if (HOT_FS_DEBUG) {
      console.log(`HotFs ${create ? "created" : "updated"} "${newPath}"`);
    }

    return true;
  }

  async _removeFile(fileName: string) {
    if (await exists(fileName)) {
      return;
    }

    const relativeName = relative(this.#dir, fileName);
    const absName = join(this.#hotDir, relativeName);
    await Deno.remove(absName, { recursive: true });

    if (HOT_FS_DEBUG) {
      console.log(`HotFs removed "${absName}"`);
    }

    return true;
  }

  async _renameFile(oldName: string, newName: string) {
    const relativeOldName = relative(this.#dir, oldName);
    const relativeNewName = relative(this.#dir, newName);

    const absOldName = join(this.#hotDir, relativeOldName);
    const absNewName = join(this.#hotDir, relativeNewName);

    if (absOldName == absNewName) {
      return;
    }

    if (await exists(absOldName)) {
      await move(absOldName, absNewName);
    } else {
      // There is the chance that the remove event is called before the rename :/
      await copy(newName, absNewName);
    }

    if (HOT_FS_DEBUG) {
      console.log(`HotFs renamed "${absNewName}"`);
    }

    return true;
  }

  async _invalidate() {
    const nextHotDir = this._nextHotDir();
    await move(this.#hotDir, nextHotDir);
    this.#hotDir = nextHotDir;
  }

  getHotDir() {
    return this.#hotDir;
  }
}
