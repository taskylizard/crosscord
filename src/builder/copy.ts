import { cp } from 'node:fs/promises'
import { join } from 'node:path'
import type { Plugin } from 'rolldown'
import { glob } from 'tinyglobby'
import { log } from './utils'

export interface CopyTarget {
  src: string | string[]
  dest: string
}

export interface CopyOptions {
  targets: CopyTarget[]
  cwd?: string
}

export const copyPlugin = (options: CopyOptions): Plugin => ({
  name: 'copy',
  buildStart: async () => {
    const { targets, cwd = process.cwd() } = options

    for (const target of targets) {
      const { src, dest } = target
      const patterns = Array.isArray(src) ? src : [src]

      for (const pattern of patterns) {
        const files = await glob(pattern, { cwd, expandDirectories: false })

        for (const file of files) {
          const srcPath = join(cwd, file)
          const destPath = join(dest, file)

          try {
            await cp(srcPath, destPath, { recursive: true })
            log(`copied ${file} to ${dest}`)
          } catch (error) {
            console.error(`Failed to copy ${file}:`, (error as Error).message)
          }
        }
      }
    }
  }
})
