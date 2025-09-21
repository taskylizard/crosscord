import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { InputOption, rolldown } from 'rolldown'
import { lightningCSSPlugin } from './lightningcss'
import { overwriterPlugin } from './overwriter'
import { experimentalPurgeCSSPlugin } from './purgecss.experimental'
import { reporterPlugin } from './reporter'
import { sharpPlugin } from './sharp'
import { CROSSCODE_DIR, entry, log, noop } from './utils'

export async function runBuilder(limit: string) {
  await rm(join(CROSSCODE_DIR, 'modules'), {
    recursive: true
  })
  const input = await entry(['**/*.js', '**/*.css', '**/*.png'], CROSSCODE_DIR)
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
    preserveModules: true,
    preserveModulesRoot: 'compiled',
    entryFileNames: '[name].js',
    assetFileNames: '[name][extname]'
  })
  await builder.close()
}
