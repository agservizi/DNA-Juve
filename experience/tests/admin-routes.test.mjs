import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADMIN_COLLECTION_SECTIONS,
  ADMIN_SINGLETON_SECTIONS,
  isAllowedAdminPath,
} from '../lib/admin-routes.ts'

test('accepts dashboard and the dedicated login route', () => {
  assert.equal(isAllowedAdminPath([]), true)
  assert.equal(isAllowedAdminPath(['login']), true)
  assert.equal(isAllowedAdminPath(['login', 'extra']), false)
})

test('accepts the complete admin navigation matrix', () => {
  for (const section of ADMIN_SINGLETON_SECTIONS) {
    assert.equal(isAllowedAdminPath([section]), true, section)
    assert.equal(isAllowedAdminPath([section, 'extra']), false, section)
  }

  for (const section of ADMIN_COLLECTION_SECTIONS) {
    assert.equal(isAllowedAdminPath([section]), true, section)
    assert.equal(isAllowedAdminPath([section, 'nuovo']), true, section)
    assert.equal(isAllowedAdminPath([section, 'record_123', 'modifica']), true, section)
  }
})

test('rejects unknown, malformed and overlong admin routes', () => {
  assert.equal(isAllowedAdminPath(['sconosciuta']), false)
  assert.equal(isAllowedAdminPath(['articoli', 'id con spazi', 'modifica']), false)
  assert.equal(isAllowedAdminPath(['articoli', 'nuovo', 'modifica']), false)
  assert.equal(isAllowedAdminPath(['articoli', 'abc', 'elimina']), false)
  assert.equal(isAllowedAdminPath(['articoli', 'abc', 'modifica', 'extra']), false)
})
