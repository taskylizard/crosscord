import { type Ansis, blue, rgb } from 'ansis'
import { Stats } from 'node:fs'
import { access, cp, rm, stat } from 'node:fs/promises'
import { dirname, extname, normalize, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import pLimit from 'p-limit'
import type { InputOption } from 'rolldown'
import { glob } from 'tinyglobby'
export const CROSSCODE_DIR = fileURLToPath(
  new URL('../../compiled', import.meta.url)
)
export const JS_EXTENSIONS = ['.js']
export const AUDIO_EXTENSIONS = ['.ogg']
export const IMAGE_EXTENSIONS = ['.png']
export const reset = '\x1b[0m'
export const l = (limit: number) => pLimit(Number(limit))
export const log = (
  message: string,
  arrowColor = '\x1b[36m',
  msgColor = '\x1b[32m'
) => console.log(`${arrowColor}->${reset} ${msgColor}${message}${reset}`)
export const output = (
  message: string,
  prefixColor = '\x1b[35m',
  msgColor = '\x1b[32m'
) => console.log(`${prefixColor}::${reset} ${msgColor}${message}${reset}`)

// Copied from tsdown - MIT License
export function formatBytes(bytes: number): string | undefined {
  if (bytes === Infinity) return undefined
  return `${(bytes / 1000).toFixed(2)} kB`
}
export const noop = <T>(v: T): T => v
// Copied from https://github.com/rolldown/tsdown/blob/f0e67ebc9aad94b5e1702d4a1eeb9c5332bd15ea/src/utils/logger.ts
// Copied from https://github.com/antfu/vscode-pnpm-catalog-lens - MIT License
const colors = new Map<string, Ansis>()
export function generateColor(name: string = 'default'): Ansis {
  if (colors.has(name)) {
    return colors.get(name)!
  }
  let color: Ansis
  if (name === 'default') {
    color = blue
  } else {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = hash % 360
    const saturation = 35
    const lightness = 55
    color = rgb(...hslToRgb(hue, saturation, lightness))
  }
  colors.set(name, color)
  return color
}
function hslToRgb(
  h: number,
  s: number,
  l: number
): [r: number, g: number, b: number] {
  h = h % 360
  h /= 360
  s /= 100
  l /= 100
  let r, g, b

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return [
    Math.max(0, Math.round(r * 255)),
    Math.max(0, Math.round(g * 255)),
    Math.max(0, Math.round(b * 255))
  ]
}
function hue2rgb(p: number, q: number, t: number) {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

export async function entry(
  entry: InputOption,
  cwd: string
): Promise<string[]> {
  if (typeof entry === 'string') entry = [entry]
  if (!Array.isArray(entry)) entry = Object.values(entry)

  const resolved = (await glob(entry, { cwd, expandDirectories: false })).map(
    (file) => resolve(cwd, file)
  )

  const base = resolved.length ? lowestCommonAncestor(...resolved) : cwd
  const ordered = Object.fromEntries(
    resolved.map(file => {
      const _relative = relative(base, file)
      return [
        _relative.slice(0, _relative.length - extname(_relative).length),
        file
      ]
    })
  )

  return Object.values(ordered)
}

export function fsExists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false
  )
}

export function fsStat(path: string): Promise<Stats | null> {
  return stat(path).catch(() => null)
}

export function fsRemove(path: string): Promise<void> {
  return rm(path, { force: true, recursive: true }).catch(() => {})
}

export function fsCopy(from: string, to: string): Promise<void> {
  return cp(from, to, { recursive: true, force: true })
}

export function lowestCommonAncestor(...filepaths: string[]): string {
  if (filepaths.length === 0) return ''
  if (filepaths.length === 1) return dirname(filepaths[0])
  filepaths = filepaths.map(normalize)
  const [first, ...rest] = filepaths
  let ancestor = first.split(sep)
  for (const filepath of rest) {
    const directories = filepath.split(sep, ancestor.length)
    let index = 0
    for (const directory of directories) {
      if (directory === ancestor[index]) {
        index += 1
      } else {
        ancestor = ancestor.slice(0, index)
        break
      }
    }
    ancestor = ancestor.slice(0, index)
  }

  return ancestor.length <= 1 && ancestor[0] === ''
    ? sep + ancestor[0]
    : ancestor.join(sep)
}
