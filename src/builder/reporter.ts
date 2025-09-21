import { stat } from 'node:fs/promises'
import { relative } from 'node:path'
import type { Plugin } from 'rolldown'
import { formatBytes, generateColor, noop, output } from './utils'

export interface ReporterOptions {
  inputDir?: string
}

export function reporterPlugin(options: ReporterOptions = {}): Plugin {
  const { inputDir = '.' } = options
  const fileSizes = new Map<string, number>()

  return {
    name: 'reporter',
    async buildStart(inputOptions) {
      const inputs = inputOptions.input
      if (typeof inputs === 'object' && inputs !== null) {
        for (const [_name, filePath] of Object.entries(inputs)) {
          try {
            const stats = await stat(filePath)
            const relativePath = relative(inputDir, filePath)
            fileSizes.set(relativePath, stats.size)
          } catch (error) {
            noop(1)
          }
        }
      }
    },
    async generateBundle(_options, bundle) {
      output('Built the following files:')

      let totalOriginal = 0
      let totalOutput = 0

      for (const [fileName, chunk] of Object.entries(bundle)) {
        const originalPath = fileName.replace(/\.js$/, '.js').replace(
          /\.css$/,
          '.css'
        )
        const originalSize = fileSizes.get(originalPath) || 0

        const outputSize = chunk.type === 'asset'
          ? (chunk.source instanceof Uint8Array
            ? chunk.source.length
            : Buffer.byteLength(chunk.source as string))
          : chunk.code.length

        if (originalSize > 0) {
          totalOriginal += originalSize
          totalOutput += outputSize

          const reduction = ((originalSize - outputSize) / originalSize) * 100
          const color = generateColor(fileName)
          const sign = reduction >= 0 ? '-' : '+'
          const formattedReduction = Math.abs(reduction).toFixed(1)

          output(
            `${color(fileName)}: ${formatBytes(originalSize)} → ${
              formatBytes(outputSize)
            } (${sign}${formattedReduction}%)`,
            '\x1b[34m', // blue prefix
            '\x1b[37m' // white text
          )
        }
      }

      if (totalOriginal > 0) {
        const totalReduction = ((totalOriginal - totalOutput) / totalOriginal) *
          100
        const sign = totalReduction >= 0 ? '-' : '+'
        const formattedTotalReduction = Math.abs(totalReduction).toFixed(1)

        output(
          `Total: ${formatBytes(totalOriginal)} → ${
            formatBytes(totalOutput)
          } (${sign}${formattedTotalReduction}%)`,
          '\x1b[33m', // yellow prefix
          '\x1b[1m' // bold text
        )
      }
    }
  }
}
