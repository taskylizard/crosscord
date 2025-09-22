import { stat } from 'node:fs/promises'
import { relative } from 'node:path'
import sharp from 'sharp'
import {
  CROSSCODE_DIR,
  entry,
  formatBytes,
  generateColor,
  l,
  log,
  output
} from '../utils'

export const image = async (options: { limit: string }) => {
  const files = await entry(
    ['**/*.png', '**/*.jpg', '**/*.jpeg'],
    CROSSCODE_DIR
  )
  log(
    `found ${files.length} image files to optimize, will run in parallel with ${options.limit} workers...`
  )

  const optimizePromises = files.map(async (file) =>
    l(Number(options.limit))(() => optimizeImage(file))
  )
  const results = await Promise.all(optimizePromises)

  let totalOriginal = 0
  let totalOptimized = 0

  for (const result of results) {
    if (result) {
      const { originalSize, newSize, relativePath } = result
      totalOriginal += originalSize
      totalOptimized += newSize

      const reduction = ((originalSize - newSize) / originalSize) * 100
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

  log('image optimization complete!')
}

async function optimizeImage(filePath: string) {
  try {
    const originalStats = await stat(filePath)
    const originalSize = originalStats.size
    const relativePath = relative(CROSSCODE_DIR, filePath)
    const ext = filePath.split('.').pop()?.toLowerCase()

    let optimizedBuffer: Buffer
    if (ext === 'png') {
      optimizedBuffer = await sharp(filePath)
        .png({ compressionLevel: 9, quality: 60 })
        .toBuffer()
    } else if (ext === 'jpg' || ext === 'jpeg') {
      optimizedBuffer = await sharp(filePath)
        .jpeg({ quality: 60 })
        .toBuffer()
    } else {
      // Skip unsupported formats
      return null
    }

    // Overwrite the file with optimized buffer
    await sharp(optimizedBuffer).toFile(filePath)

    const newStats = await stat(filePath)
    const newSize = newStats.size

    return { originalSize, newSize, relativePath }
  } catch (error) {
    console.error(
      `✗ Failed to optimize ${filePath}:`,
      (error as Error).message
    )
    // Don't fail the whole process for one file
    return null
  }
}
