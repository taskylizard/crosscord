import { fileURLToPath } from 'bun'
import { rolldown } from 'rolldown'

const builder = rolldown({
  input: fileURLToPath(new URL('./runtime/main.ts', import.meta.url)),
  platform: 'browser'
})
