import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { Plugin } from 'rolldown'

export const overwriterPlugin: Plugin = {
  name: 'overwriter',
  async generateBundle(_, bundle) {
    for (const [fileName, chunk] of Object.entries(bundle)) {
      // resolve original path inside compiled dir
      const target = resolve('compiled', fileName)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(
        target,
        chunk.type === 'asset' ? chunk.source as string : chunk.code
      )
    }
  }
}
