import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemas'

export default defineConfig({
  name: 'cryptid-field-station',
  title: 'Cryptid Field Station',
  projectId: 'yy3ugxmv',
  dataset: 'production',
  plugins: [structureTool()],
  schema: {types: schemaTypes},
})
