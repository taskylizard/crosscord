import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { html } from 'hono/html'
import { logger } from 'hono/logger'

type Env = {
  DISCORD_CLIENT_ID: string
  DISCORD_CLIENT_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()
process.env.NODE_ENV !== 'production' && app.use(logger())

app.get('/', (c) => {
  return c.html(html`
    <!DOCTYPE html>
    <html>
      <head>
        <title>crosscord</title>
        <!-- Custom entry point -->
        <!-- <script src="/runtime/main" type="module"></script> -->

        <link
          rel="stylesheet"
          type="text/css"
          href="/impact/page/css/style.css"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="/impact/page/css/ui-darkness/jquery-ui-1.10.2.custom.min.css"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="/game/page/game-base.css"
        />

        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="viewport"
          content="width=320, initial-scale=0.5, maximum-scale=0.5, user-scalable=0"
        />

        <script
          type="text/javascript"
          src="/impact/page/js/aes.js"
          charset="utf-8"
        ></script>
        <script
          type="text/javascript"
          src="/impact/page/js/seedrandom.js"
          charset="utf-8"
        ></script>
        <script
          type="text/javascript"
          src="/impact/page/js/jquery-1.11.1.min.js"
          charset="utf-8"
        ></script>
        <script
          type="text/javascript"
          src="/impact/page/js/jquery-ui-1.10.2.custom.min.js"
          charset="utf-8"
        ></script>
        <script
          type="text/javascript"
          src="/game/page/game-base.js"
          charset="utf-8"
        ></script>
        <script>
          var IG_GAME_SCALE = 2;
          var IG_GAME_CACHE = "";
          var IG_ROOT = "";
          var IG_WIDTH = 568;
          var IG_HEIGHT = 320;
          var IG_HIDE_DEBUG = false;
          var IG_SCREEN_MODE_OVERRIDE = 2;
          var IG_WEB_AUDIO_BGM = false;
          var IG_FORCE_HTML5_AUDIO = false;
          var LOAD_LEVEL_ON_GAME_START = null;
        </script>
        <script>
          var IG_GAME_DEBUG = false;
          var IG_GAME_BETA = false;
        </script>
        <script type="text/javascript" src="/js/game.compiled.js"></script>
        <script
          type="text/javascript"
          src="/impact/page/js/options.js"
          charset="utf-8"
        ></script>
      </head>
      <body style="overflow: hidden">
        <div id="options" class="toggleMenu" style="display: none">
          <a class="trigger"><span>Options</span></a>
          <ul class="optionList"></ul>
        </div>

        <div id="game">
          <canvas id="canvas"></canvas>
        </div>

        <script type="text/javascript">
          function doStartCrossCodePlz() {
            if (window.startCrossCode) {
              $(".playOptions").fadeIn(200);
              startCrossCode();
            } else {
              window.setTimeout(doStartCrossCodePlz, 100);
            }
          }

          window.onload = doStartCrossCodePlz;
        </script>
      </body>
    </html>
  `)
})

app.use(
  '/*',
  serveStatic({
    root: './compiled/',
    onFound: (path, c) => {}
  })
)

app.post('/api/token', async (c) => {
  const code = await c.req
    .json()
    .then(({ code }) => {
      return code
    })
    .catch(() => {
      return undefined
    })

  if (code === undefined) {
    return c.json({ error: 'Code is undefined' })
  }

  if (code === null) {
    return c.json({ error: 'Code is null' })
  }

  if (typeof code !== 'string') {
    return c.json({ error: 'Code is not a string' })
  }

  const { access_token, error } = await fetch(
    `https://discord.com/api/oauth2/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: c.env.DISCORD_CLIENT_ID,
        client_secret: c.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code
      })
    }
  ).then(async (response) => {
    if (!response.ok) {
      console.error({
        status: response.status,
        details: response.statusText,
        code
      })
      return { access_token: '', error: 'Failed to get access token' }
    }

    return response.json() as Promise<{ access_token: string; error: string }>
  })

  return c.json({ access_token, error })
})

export default app
