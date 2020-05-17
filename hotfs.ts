import { join, move, signal, ensureSymlink } from "./deps.js";

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
  #hotDir = "";
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
    await ensureSymlink(this.#dir, this.#hotDir);
  }

  _nextHotDir() {
    const newHotId = hotId++;
    const hotDir = `.${this.#hotPrefix}${newHotId}`;
    const abs = join(Deno.cwd(), hotDir);

    return abs;
  }

  async initWatch() {
    const onFsChange = debounce(this._onFsChange, this.#debounce);

    const watcher = Deno.watchFs([
      this.#dir,
    ]);
    for await (const event of watcher) {
      onFsChange();
    }
  }

  #reloading: Promise<any> | false = false;
  #nextReload = false;
  _onFsChange = async () => {
    if (this.#nextReload) {
      return;
    }

    let nextReload = false;

    if (this.#reloading) {
      this.#nextReload = true;
      nextReload = true;
      await this.#reloading;
    }

    this.#reloading = this._reload();
    await this.#reloading;
    this.#reloading = false;
    if (nextReload) {
      this.#nextReload = false;
    }
  };

  async _reload() {
    await this._invalidate();
    await this.#onReload();
  }

  async _invalidate() {
    if (HOT_FS_DEBUG) {
      console.log(`HotFs invalidated`);
    }
    const nextHotDir = this._nextHotDir();
    await move(this.#hotDir, nextHotDir);
    this.#hotDir = nextHotDir;
  }

  getHotDir() {
    return this.#hotDir;
  }
}
