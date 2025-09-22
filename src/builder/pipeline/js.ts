import { readFile, stat, writeFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { minify } from 'oxc-minify'
import {
  CROSSCODE_DIR,
  entry,
  formatBytes,
  generateColor,
  log,
  output
} from '../utils'

export async function js() {
  const files = await entry(['**/*.js'], CROSSCODE_DIR)
  log(`found ${files.length} js files...`)

  let totalOriginal = 0
  let totalOptimized = 0

  for (const path of files) {
    const originalStats = await stat(path)

    const originalSize = originalStats.size

    const content = await readFile(path, 'utf-8')

    const result = minify(path, content, {
      compress: {
        target: 'es2015'
      },
      codegen: {
        removeWhitespace: true
      },
      sourcemap: false
    })

    if (result.code) {
      await writeFile(path, result.code)

      const newStats = await stat(path)

      const newSize = newStats.size

      totalOriginal += originalSize
      totalOptimized += newSize

      const reduction = ((originalSize - newSize) / originalSize) * 100
      const relativePath = relative(CROSSCODE_DIR, path)
      const color = generateColor(relativePath)
      const sign = reduction >= 0 ? '-' : '+'
      const formattedReduction = Math.abs(reduction).toFixed(1)

      output(
        `${color(relativePath)}: ${formatBytes(originalSize)} → ${
          formatBytes(newSize)
        } (${sign}${formattedReduction}%)`,
        '\x1b[34m', // blue prefix
        '\x1b[37m' // white text
      )
    }
  }

  if (totalOriginal > 0) {
    const totalReduction = ((totalOriginal - totalOptimized) / totalOriginal) *
      100
    const sign = totalReduction >= 0 ? '-' : '+'
    const formattedTotalReduction = Math.abs(totalReduction).toFixed(1)

    output(
      `Total: ${formatBytes(totalOriginal)} → ${
        formatBytes(totalOptimized)
      } (${sign}${formattedTotalReduction}%)`,
      '\x1b[33m', // yellow prefix
      '\x1b[1m' // bold text
    )
  }

  log('js minification complete!')
}
