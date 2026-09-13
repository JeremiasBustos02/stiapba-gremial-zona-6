import { describe, expect, it } from 'vitest'
import { documentTypeDefinition } from './documentTypeDefinition'

describe('document type definitions', () => {
  it('defines the current Permiso Gremial base fields once for individual and bulk flows', () => {
    const definition = documentTypeDefinition('PERMISO_GREMIAL')

    expect(definition.fields.map((field) => field.key)).toEqual([
      'provinceId', 'companyId', 'delegateId', 'agreementId', 'issueDate', 'permitDay',
    ])
    expect(definition.fields.filter((field) => field.sharedInBulk).map((field) => field.key))
      .toEqual(['provinceId', 'companyId', 'agreementId', 'issueDate', 'permitDay'])
  })
})
