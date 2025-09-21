#!/usr/bin/env bun

import { spawn } from 'child_process'
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile
} from 'fs/promises'
import { minify } from 'oxc-minify'
import pLimit from 'p-limit'
import { extname, join, relative } from 'path'
import { parseArgs } from 'util'

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
    }
  }
})
const CROSSCODE_DIR = './compiled'
const JS_EXTENSIONS = ['.js']
const AUDIO_EXTENSIONS = ['.ogg']
const IMAGE_EXTENSIONS = ['.png']
const reset = '\x1b[0m'
const l = pLimit(Number(values.limit))
const log = (message: string, arrowColor = '\x1b[36m', msgColor = '\x1b[32m') =>
  console.log(`${arrowColor}->${reset} ${msgColor}${message}${reset}`)
const output = (
  message: string,
  prefixColor = '\x1b[35m',
  msgColor = '\x1b[32m'
) => console.log(`${prefixColor}::${reset} ${msgColor}${message}${reset}`)

async function findFiles(dir: string, extensions: string[]) {
  const files: string[] = []

  async function traverse(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)

      if (entry.isDirectory()) {
        await traverse(fullPath)
      } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
        files.push(fullPath)
      }
    }
  }

  await traverse(dir)
  return files
}

async function minifyFile(filePath: string) {
  try {
    const originalStats = await stat(filePath)
    const originalSize = originalStats.size
    const code = await readFile(filePath, 'utf8')
    const relativePath = relative(process.cwd(), filePath)

    const result = minify(relativePath, code, {
      compress: {
        target: 'es2015'
      },
      mangle: {
        toplevel: true
      },
      codegen: {
        removeWhitespace: true
      },
      sourcemap: false
    })

    if (result.code) {
      await writeFile(filePath, result.code)
      const newStats = await stat(filePath)
      const newSize = newStats.size
      const reduction = (
        ((originalSize - newSize) / originalSize) *
        100
      ).toFixed(1)

      output(
        `minified: ${relativePath} (${Math.round(originalSize / 1024)}KB → ${
          Math.round(newSize / 1024)
        }KB, -${reduction}%)`
      )
    }
  } catch (error) {
    console.error(`✗ Failed to minify ${filePath}:`, error.message)
  }
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
              error.message
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
        console.error(`✗ Failed to optimize ${filePath}:`, error.message)
        // Don't fail the whole process for one file
        resolve(void 0)
      })
    } catch (error) {
      console.error(
        `✗ Failed to get original size for ${filePath}:`,
        error.message
      )
      resolve(void 0)
    }
  })
}

// TODO: Fix this
async function compressAudio(filePath: string) {
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
            console.error(`✗ Failed to replace ${filePath}:`, error.message)
            reject(error)
          }
        } else {
          console.error(`✗ FFmpeg failed for ${filePath} with code ${code}`)
          // Don't fail the whole process for one file
          resolve(void 0)
        }
      })

      ffmpeg.on('error', (error) => {
        console.error(`✗ Failed to compress ${filePath}:`, error.message)
        // Don't fail the whole process for one file
        resolve(void 0)
      })
    } catch (error) {
      console.error(
        `✗ Failed to get original size for ${filePath}:`,
        error.message
      )
      resolve(void 0)
    }
  })
}

async function cleanCompiledDir() {
  try {
    await rm(CROSSCODE_DIR, { recursive: true, force: true })
    log('cleaned compiled directory')
  } catch (error) {
    console.error(`✗ Failed to clean ${CROSSCODE_DIR}:`, error.message)
  }
}

log('starting...')

try {
  if (values.clean) {
    await cleanCompiledDir()
  }

  await mkdir('./compiled', { recursive: true })
  await cp('./CrossCode/assets', './compiled', { recursive: true })
  await rename('./compiled/node-webkit.html', './compiled/index.html')

  log('finished preparing, beginning compilation...')

  const jsFiles = await findFiles(CROSSCODE_DIR, JS_EXTENSIONS)
  log(`found ${jsFiles.length} js files to minify...`)

  for (const file of jsFiles) await minifyFile(file)

  log('js minification complete!')

  const pngFiles = await findFiles(CROSSCODE_DIR, IMAGE_EXTENSIONS)
  log(
    `found ${pngFiles.length} png files to optimize, will run in parallel with ${values.limit} workers...`
  )

  const optimizePngPromises = pngFiles.map(async (file) =>
    l(() => optimizePng(file))
  )
  await Promise.all(optimizePngPromises)

  log('png optimization complete!')

  log('all optimization complete!')
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
