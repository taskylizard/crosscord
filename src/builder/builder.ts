import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { copyCCLoader3RuntimeCCMod } from './ccloader3'
import { js } from './pipeline/js'
import { CROSSCODE_DIR } from './utils'

export async function runBuilder(_limit: string) {
  await rm(join(CROSSCODE_DIR, 'modules'), {
    recursive: true
  })

  await js()
  // await image({ limit })
  // await lightingcss()
  await copyCCLoader3RuntimeCCMod()
}
