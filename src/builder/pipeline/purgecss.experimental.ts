import { PurgeCSS, type UserDefinedOptions } from 'purgecss'
import type { EmittedAsset, OutputChunk, OutputOptions } from 'rolldown'
import { readFileSync } from 'fs'
import { join } from 'path'

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
        // Read server.ts content to include HTML template in purging analysis
        const serverContent = readFileSync(join(process.cwd(), 'src/server.ts'), 'utf-8')
        
        const purged = await new PurgeCSS().purge({
          content: [{
            raw: _html + ' ' + serverContent + ' ' + Object.entries(bundle).map(([_, v]) => {
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
