import {defineType, defineField} from 'sanity'

export const cryptid = defineType({
  name: 'cryptid',
  title: 'Cryptid',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'name'}, validation: (r) => r.required()}),
    defineField({
      name: 'classification',
      type: 'string',
      options: {
        list: [
          {title: 'Sky', value: 'sky'},
          {title: 'Forest', value: 'forest'},
          {title: 'Water', value: 'water'},
          {title: 'Desert', value: 'desert'},
          {title: 'Urban', value: 'urban'},
          {title: 'Subterranean', value: 'subterranean'},
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({name: 'dangerLevel', type: 'number', validation: (r) => r.required().min(1).max(5)}),
    defineField({name: 'firstReported', type: 'date'}),
    defineField({
      name: 'status',
      type: 'string',
      options: {list: ['active', 'dormant', 'debunked']},
      initialValue: 'active',
    }),
    defineField({name: 'habitat', type: 'text', rows: 2}),
    defineField({name: 'description', type: 'text', rows: 4, validation: (r) => r.required()}),
    defineField({name: 'distinctiveTraits', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'imageUrl', type: 'url'}),
  ],
  preview: {select: {title: 'name', subtitle: 'classification'}},
})
