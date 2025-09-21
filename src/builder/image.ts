import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { relative } from 'node:path'
import {
  CROSSCODE_DIR,
  IMAGE_EXTENSIONS,
  l,
  log,
  output,
  search
} from './utils'

export async function png(limit: string) {
  const pngFiles = await search(CROSSCODE_DIR, IMAGE_EXTENSIONS)
  log(
    `found ${pngFiles.length} png files to optimize, will run in parallel with ${limit} workers...`
  )

  const optimizePngPromises = pngFiles.map(async (file) =>
    l(Number(limit))(() => optimizePng(file))
  )
  await Promise.all(optimizePngPromises)

  log('png optimization complete!')
}

async function optimizePng(filePath: string) {
  return new Promise(async (resolve, reject) => {
    try {
      const originalStats = await stat(filePath)
      const originalSize = originalStats.size
      const relativePath = relative(process.cwd(), filePath)

      const oxipng = spawn('oxipng', [
        '-o',
        '4',
        '--strip',
        'safe',
        '--alpha',
        filePath
      ])

      oxipng.stderr.on('data', (_data) => {})

      oxipng.on('close', async (code) => {
        if (code === 0) {
          try {
            const newStats = await stat(filePath)
            const newSize = newStats.size
            const reduction = (
              ((originalSize - newSize) / originalSize) *
              100
            ).toFixed(1)

            output(
              `optimized: ${relativePath} (${
                Math.round(originalSize / 1024)
              }KB → ${Math.round(newSize / 1024)}KB, -${reduction}%)`
            )
            resolve(void 0)
          } catch (error) {
            console.error(
              `✗ Failed to get new size for ${filePath}:`,
              (error as Error).message
            )
            reject(error)
          }
        } else {
          console.error(`✗ oxipng failed for ${filePath} with code ${code}`)
          // Don't fail the whole process for one file
          resolve(void 0)
        }
      })

      oxipng.on('error', (error) => {
        console.error(
          `✗ Failed to optimize ${filePath}:`,
          (error as Error).message
        )
        // Don't fail the whole process for one file
        resolve(void 0)
      })
    } catch (error) {
      console.error(
        `✗ Failed to get original size for ${filePath}:`,
        (error as Error).message
      )
      resolve(void 0)
    }
  })
}
