import { spawn } from 'node:child_process'
import { readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { relative } from 'node:path'

// TODO: Fix this
export async function compressAudio(filePath: string) {
  return new Promise(async (resolve, reject) => {
    try {
      const originalStats = await stat(filePath)
      const originalSize = originalStats.size
      const relativePath = relative(process.cwd(), filePath)
      console.log(`Compressing: ${relativePath}`)

      const tempPath = filePath + '.temp.ogg'

      const ffmpeg = spawn('ffmpeg', [
        '-i',
        filePath,
        '-c:a',
        'libvorbis',
        '-q:a',
        '3',
        '-y', // Overwrite output file
        tempPath
      ])

      ffmpeg.stderr.on('data', (_data) => {
        // FFmpeg outputs progress to stderr, we can ignore most of it
      })

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          try {
            const compressedData = await readFile(tempPath)
            await writeFile(filePath, compressedData)
            await unlink(tempPath)

            const newStats = await stat(filePath)
            const newSize = newStats.size
            const reduction = (
              ((originalSize - newSize) / originalSize) *
              100
            ).toFixed(1)

            console.log(
              `✓ compressed: ${relativePath} (${
                Math.round(originalSize / 1024)
              }KB → ${Math.round(newSize / 1024)}KB, -${reduction}%)`
            )
            resolve(void 0)
          } catch (error) {
            console.error(
              `✗ Failed to replace ${filePath}:`,
              (error as Error).message
            )
            reject(error)
          }
        } else {
          console.error(`✗ FFmpeg failed for ${filePath} with code ${code}`)
          // Don't fail the whole process for one file
          resolve(void 0)
        }
      })

      ffmpeg.on('error', (error) => {
        console.error(
          `✗ Failed to compress ${filePath}:`,
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
