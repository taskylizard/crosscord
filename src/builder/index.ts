import { cp, mkdir, rename, rm } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { runBuilder } from './builder'
import { CROSSCODE_DIR, log } from './utils'

const { values } = parseArgs({
  options: {
    clean: {
      type: 'boolean',
      short: 'c'
    },
    limit: {
      type: 'string',
      short: 'l',
      default: '5'
    },
    prepare: {
      type: 'boolean',
      short: 'p'
    }
  }
})

async function cleanCompiledDir() {
  try {
    await rm(CROSSCODE_DIR, { recursive: true, force: true })
    log('cleaned compiled directory')
  } catch (error) {
    console.error(
      `✗ Failed to clean ${CROSSCODE_DIR}:`,
      (error as Error).message
    )
  }
}

async function prepare() {
  await mkdir('./compiled', { recursive: true })
  await cp('./CrossCode/assets', './compiled', { recursive: true })
  await rename('./compiled/node-webkit.html', './compiled/index.html')

  log('finished preparing, beginning compilation...')
}

log('starting...')

try {
  if (values.clean) await cleanCompiledDir()
  if (values.prepare) await prepare()

  await runBuilder(values.limit)
} catch (error) {
  console.error('❌ Error:', (error as Error).message)
  process.exit(1)
}
