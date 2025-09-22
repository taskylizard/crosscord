import { ZipWriter } from '@zip.js/zip.js'
import { BlobWriter } from '@zip.js/zip.js'
import AdmZip from 'adm-zip'
import { readdir, stat } from 'fs/promises'
import { writeFile } from 'fs/promises'
import { createReadStream } from 'node:fs'
import { relative } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { join } from 'path'
import { log, output } from './utils'

export async function copyCCLoader3RuntimeCCMod() {
  log('adding ccloader3 runtime...')
  const runtimeModDir = fileURLToPath(
    new URL('../../ccloader3/dist/runtime', import.meta.url)
  )
  const outFile = fileURLToPath(
    new URL('../../compiled/ccloader3-runtime.zip', import.meta.url)
  )
  output(`copying ccloader3 runtime from ${runtimeModDir}`)
  output(`writing to ${outFile}`)
  await stat(runtimeModDir)
  const zip = new AdmZip()
  zip.addLocalFolder(runtimeModDir)
  zip.writeZipPromise(outFile)
  log('finished adding ccloader3 runtime')
}

// FIXME: Hangs on bun for some reason
export const zipDirectory = async (sourceDir: string, outputFile: string) => {
  const writer = new BlobWriter('application/zip')
  const zipWriter = new ZipWriter(writer)

  const walk = async (dir: string) => {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relPath = relative(sourceDir, fullPath).replace(/\\/g, '/')

      if (entry.isDirectory()) {
        await walk(fullPath)
      } else {
        const fileStat = await stat(fullPath)
        if (!fileStat.isFile()) continue
        // pass readable stream to zip to avoid buffering
        const stream = createReadStream(fullPath)
        await zipWriter.add(
          relPath,
          Readable.toWeb(stream) as unknown as ReadableStream
        )
      }
    }
  }

  await walk(sourceDir)
  const blob = await zipWriter.close()
  const buffer = Buffer.from(await blob.arrayBuffer())
  await writeFile(outputFile, buffer)
}
