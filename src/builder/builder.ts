import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type InputOption, rolldown } from 'rolldown'
import { copyCCLoader3RuntimeCCMod } from './ccloader3'
import { copyPlugin } from './copy'
import { overwriterPlugin } from './overwriter'
import { lightningCSSPlugin } from './pipeline/lightningcss'
import { experimentalPurgeCSSPlugin } from './pipeline/purgecss.experimental'
import { sharpPlugin } from './pipeline/sharp'
import { reporterPlugin } from './reporter'
import { CROSSCODE_DIR, entry, log, noop } from './utils'

export async function runBuilder(limit: string) {
  await rm(join(CROSSCODE_DIR, 'modules'), {
    recursive: true
  })
  const input = await entry(['**/*.js', '**/*.css'], CROSSCODE_DIR)
  log(`found ${Object.keys(input).length} files to bundle...`)
  return await runner(input, limit)
}

async function runner(input: InputOption, limit: string) {
  const builder = await rolldown({
    input,
    plugins: [
      overwriterPlugin,
      await lightningCSSPlugin({ options: { minify: true } }),
      experimentalPurgeCSSPlugin({}),
      sharpPlugin({ limit }),
      reporterPlugin({ inputDir: CROSSCODE_DIR })
    ],
    platform: 'browser',
    external: ['nw.gui'],
    moduleTypes: {
      '.png': 'asset',
      '.ttf': 'asset',
      '.otf': 'asset'
    },
    onwarn: noop(() => {})
  })

  await builder.write({
    minify: true,
    dir: CROSSCODE_DIR,
    preserveModules: true,
    preserveModulesRoot: 'compiled',
    entryFileNames: '[name].js',
    assetFileNames: 'assets/[name][extname]'
  })
  await builder.close()
  await copyCCLoader3RuntimeCCMod()
  return
}
