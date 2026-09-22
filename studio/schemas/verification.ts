import {defineType, defineField} from 'sanity'

/**
 * One row per workflow transition. The agent and the ranger both write here
 * through the same `transition()` path, so the audit trail is the workflow.
 */
export const verification = defineType({
  name: 'verification',
  title: 'Verification log',
  type: 'document',
  fields: [
    defineField({name: 'sighting', type: 'reference', to: [{type: 'sighting'}], validation: (r) => r.required()}),
    defineField({name: 'from', type: 'string'}),
    defineField({name: 'to', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'actor',
      type: 'string',
      options: {list: ['agent', 'ranger', 'system']},
      validation: (r) => r.required(),
    }),
    defineField({name: 'note', type: 'text', rows: 3}),
    defineField({
      name: 'checks',
      type: 'object',
      fields: [
        defineField({name: 'aiScore', type: 'number'}),
        defineField({name: 'aiVerdict', type: 'string'}),
        defineField({name: 'aiReasons', type: 'array', of: [{type: 'string'}]}),
        defineField({name: 'weatherSummary', type: 'string'}),
      ],
    }),
    defineField({name: 'decidedAt', type: 'datetime', initialValue: () => new Date().toISOString()}),
  ],
  preview: {select: {title: 'to', subtitle: 'actor'}},
})
