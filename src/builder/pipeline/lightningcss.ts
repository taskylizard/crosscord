import type { Plugin } from 'rolldown'

type Options = Parameters<
  typeof import('unplugin-lightningcss/rolldown')['default']
>[0]

export async function lightningCSSPlugin(
  options: Options
): Promise<Plugin | undefined> {
  const LightningCSS = await import('unplugin-lightningcss/rolldown').catch(
    () => undefined
  )
  if (!LightningCSS) return

  return LightningCSS.default(options)
}
