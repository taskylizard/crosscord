import { PurgeCSS, type UserDefinedOptions } from 'purgecss'
import type { EmittedAsset, OutputChunk, OutputOptions } from 'rolldown'

export function experimentalPurgeCSSPlugin(
  options: Partial<UserDefinedOptions>
) {
  let _html = ''
  return {
    name: 'purgecss',
    enforce: 'post',
    transformIndexHtml(html: string) {
      _html += html
    },
    async generateBundle(
      _options: OutputOptions,
      bundle: { [fileName: string]: EmittedAsset | OutputChunk }
    ) {
      const cssFiles = Object.keys(bundle).filter(key => key.endsWith('.css'))
      if (!cssFiles) {
        return
      }
      for (const file of cssFiles) {
        const purged = await new PurgeCSS().purge({
          content: [{
            raw: _html + ' ' + Object.entries(bundle).map(([_, v]) => {
              return (v as OutputChunk).code
            }).join('; '),
            extension: 'html'
          }],
          // @ts-expect-error
          css: [{ raw: (bundle as unknown as EmittedAsset)[file].source }],
          ...options
        }) // @ts-expect-error
        ;(bundle as unknown as EmittedAsset)[file].source = purged[0].css
      }
    }
  }
}
