import assert from 'node:assert/strict'
import test from 'node:test'
import { isAdminProfile } from '../lib/admin-auth.ts'

test('authorizes only the exact admin database role', () => {
  assert.equal(isAdminProfile({ role: 'admin', username: 'admin' }), true)
  assert.equal(isAdminProfile({ role: 'author', username: 'admin' }), false)
  assert.equal(isAdminProfile({ role: 'reader', username: null }), false)
  assert.equal(isAdminProfile({ role: 'Admin', username: null }), false)
  assert.equal(isAdminProfile(null), false)
  assert.equal(isAdminProfile(undefined), false)
})
