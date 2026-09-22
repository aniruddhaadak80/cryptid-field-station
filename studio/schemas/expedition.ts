import {defineType, defineField} from 'sanity'

export const expedition = defineType({
  name: 'expedition',
  title: 'Expedition',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'title'}}),
    defineField({name: 'cryptids', type: 'array', of: [{type: 'reference', to: [{type: 'cryptid'}]}]}),
    defineField({name: 'sightings', type: 'array', of: [{type: 'reference', to: [{type: 'sighting'}]}]}),
    defineField({name: 'startsAt', type: 'date'}),
    defineField({name: 'endsAt', type: 'date'}),
    defineField({name: 'notes', type: 'text', rows: 3}),
  ],
})
