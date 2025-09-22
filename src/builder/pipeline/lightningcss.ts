import { transform } from 'lightningcss'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { CROSSCODE_DIR, entry, log, output } from '../utils'

export async function lightingcss() {
  const files = await entry(['**/*.css'], CROSSCODE_DIR)
  log(`found ${files.length} css files...`)

  for (const file of files) {
    const originalStats = await stat(file)
    const originalSize = originalStats.size
    const content = await readFile(file)
    const result = transform({
      code: content,
      filename: file,
      minify: true
    })
    if (result.code) {
      await writeFile(file, result.code)
      const newStats = await stat(file)
      const newSize = newStats.size
      const reduction = ((originalSize - newSize) / originalSize) * 100
      output(
        `lightningcss: ${relative(process.cwd(), file)} (${
          Math.round(originalSize / 1024)
        }KB → ${Math.round(newSize / 1024)}KB, -${reduction}%)`
      )
    }
  }
}
