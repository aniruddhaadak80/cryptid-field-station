import {defineType, defineField} from 'sanity'
import {EvidenceGifInput} from '../components/EvidenceGifInput'

export const sighting = defineType({
  name: 'sighting',
  title: 'Sighting',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'cryptid',
      type: 'reference',
      to: [{type: 'cryptid'}],
      validation: (r) => r.required(),
    }),
    defineField({name: 'reporterName', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'observedAt', type: 'datetime', validation: (r) => r.required()}),
    defineField({name: 'locationName', type: 'string'}),
    defineField({name: 'location', type: 'geopoint'}),
    defineField({name: 'story', type: 'text', rows: 6, validation: (r) => r.required().min(80)}),
    defineField({
      name: 'evidenceUrl',
      type: 'url',
      title: 'Evidence (image or video URL)',
      components: {input: EvidenceGifInput},
    }),
    defineField({
      name: 'evidenceType',
      type: 'string',
      options: {list: ['image', 'video']},
      initialValue: 'image',
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {list: ['submitted', 'in-review', 'verified', 'rejected', 'published']},
      initialValue: 'submitted',
      readOnly: true,
      description: 'Owned by the workflow — advance it from the Ranger board, not by hand.',
    }),
    defineField({name: 'credibilityScore', type: 'number', readOnly: true}),
    defineField({
      name: 'weather',
      type: 'object',
      readOnly: true,
      fields: [
        defineField({name: 'summary', type: 'string'}),
        defineField({name: 'temperatureC', type: 'number'}),
        defineField({name: 'conditions', type: 'string'}),
      ],
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'status'}},
})
