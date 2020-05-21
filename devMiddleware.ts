import {
  acceptWebSocket,
} from "./deps.js";

export const create = function () {
  let devSockets: any = [];

  const clientCode =
    `const socket = new WebSocket('ws://' + location.host + '/nexoDev');
  socket.onopen = () => {
    console.info('Connected to Nexo Dev Server');
  };
  socket.onmessage = (msg) => {
    if (msg.data === 'reload') {
      let tries = 0;
      let maxTries = 15;
      const reconnect = async function() {
        let res;

        try {
          const res = await fetch('/nexoDev')
          if (res.status === 200) {
            location.reload(true);
          }
        }
        catch(err) {
          console.dir(err);
        }

        tries++;
        if (tries === maxTries) {
          console.error('Failed to reconnect to Nexo Dev Server')
          return;
        }

        setTimeout(function() {
          reconnect()
        }, 1000)
      }
      reconnect()
    }
  };`;

  const middleware = async function (ctx: any, next: any) {
    if (ctx.request.url.pathname !== "/nexoDev") {
      return await next();
    }

    if (ctx.request.headers.get("upgrade") !== "websocket") {
      ctx.response.status = 200;
      return;
    }

    const { conn, r: bufReader, w: bufWriter, headers } =
      ctx.request.serverRequest;

    try {
      const sock = await acceptWebSocket({
        conn,
        bufReader,
        bufWriter,
        headers,
      });

      let idx = devSockets.push(sock) - 1;

      try {
        for await (const ev of sock) {
        }

        devSockets.splice(idx, 1);
      } catch (err) {
        console.error(`Dev Server failed to receive frame: ${err}`);

        if (!sock.isClosed) {
          await sock.close(1000).catch(console.error);
        }
      }
    } catch (err) {
      console.error(`Dev Server failed to accept websocket: ${err}`);
      ctx.response.status = 400;
    }
  };

  const sendReload = async function () {
    for (const sock of devSockets) {
      await sock.send("reload");
      await sock.close(1000);
    }

    // A horrible workaround because closing sockets in an oak request needs "some extra time"
    await new Promise(function (res) {
      setTimeout(res);
    });
  };

  return { middleware, clientCode, sendReload };
};
