import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  canBan,
  checkReplyBody,
  checkTitle,
  checkTopicBody,
  topicMoved,
  topicsSignature,
  unseenReplies,
} from './forum.js'
import { clearAllDrafts, clearDraft, isChanged, readDraft, saveDraft } from './drafts.js'
import { describeError, parseRetryAfter, waitText } from './forms.js'

// A stand-in for sessionStorage.
function memoryStorage() {
  const data = new Map()
  return {
    get length() {
      return data.size
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  }
}

test('empty, short and very long posts are caught before sending', () => {
  assert.equal(checkTitle('   '), 'Enter a title.')
  assert.equal(checkTitle(' abcd '), 'Use at least 5 characters.')
  assert.equal(checkTitle('a'.repeat(120)), null)
  assert.match(checkTitle('a'.repeat(121)), /at most 120/)
  // Characters, not UTF-16 units: 120 emoji fit.
  assert.equal(checkTitle('💎'.repeat(120)), null)
  assert.equal(checkTopicBody('\n\n  \n'), 'Write something for your topic.')
  assert.match(checkTopicBody('x'.repeat(10001)), /10,000/)
  assert.equal(checkReplyBody(0)(''), 'Write a reply or add an image.')
  assert.equal(checkReplyBody(1)(''), null, 'images alone are a reply')
  assert.match(checkReplyBody(0)('x'.repeat(5001)), /5,000/)
})

test('ban controls follow the roles in the contract', () => {
  const member = { id: 'm', role: 'member' }
  const mod = { id: 'mod', role: 'moderator' }
  const admin = { id: 'a', role: 'admin' }
  assert.equal(canBan(mod, member), true)
  assert.equal(canBan(mod, mod), false, 'not yourself')
  assert.equal(canBan(mod, { id: 'mod2', role: 'moderator' }), false)
  assert.equal(canBan(admin, mod), true)
  assert.equal(canBan(admin, { id: 'a2', role: 'admin' }), false)
  assert.equal(canBan(mod, null), false, 'deleted account')
})

test('new replies from other members are found once, oldest first', () => {
  const r = (id, minute) => ({ id, createdAt: `2026-11-17T10:${String(minute).padStart(2, '0')}:00.000Z` })
  const shown = [r('a', 1), r('b', 2), r('mine', 5)]
  const fetched = [r('b', 2), r('d', 6), r('c', 3), r('mine', 5)]
  assert.deepEqual(
    unseenReplies(shown, fetched).map((x) => x.id),
    ['c', 'd'],
  )
  assert.deepEqual(unseenReplies(shown, shown), [])
})

test('a topic or list counts as changed only when something moved', () => {
  const topic = { replyCount: 2, lastActivityAt: 'x', title: 'T', id: '1', pinned: false, locked: false }
  assert.equal(topicMoved(topic, { ...topic }), false)
  assert.equal(topicMoved(topic, { ...topic, replyCount: 3 }), true)
  assert.equal(topicMoved(topic, { ...topic, lastActivityAt: 'y' }), true)
  assert.equal(topicsSignature([topic]), topicsSignature([{ ...topic }]))
  assert.notEqual(topicsSignature([topic]), topicsSignature([{ ...topic, locked: true }]))
})

test('drafts belong to one member and survive a session ending', () => {
  const s = memoryStorage()
  saveDraft('topic:1:reply', 'u1', { values: { body: 'Half written' }, images: [{ id: 'i1' }] }, s)
  assert.deepEqual(readDraft('topic:1:reply', 'u1', s), { values: { body: 'Half written' }, images: [{ id: 'i1' }] })
  assert.equal(readDraft('topic:1:reply', 'u2', s), null, 'another member on this tab sees nothing')
  clearDraft('topic:1:reply', s)
  assert.equal(readDraft('topic:1:reply', 'u1', s), null)

  saveDraft('topic:new', 'u1', { values: { title: 'x' }, images: [] }, s)
  s.setItem('unrelated', 'keep')
  clearAllDrafts(s)
  assert.equal(readDraft('topic:new', 'u1', s), null, 'logout clears drafts')
  assert.equal(s.getItem('unrelated'), 'keep')
})

test('drafts fail quietly when storage is blocked or broken', () => {
  const broken = {
    getItem() {
      throw new Error('blocked')
    },
    setItem() {
      throw new Error('full')
    },
    removeItem() {
      throw new Error('blocked')
    },
  }
  assert.equal(readDraft('k', 'u', broken), null)
  assert.doesNotThrow(() => saveDraft('k', 'u', { values: {}, images: [] }, broken))
  assert.doesNotThrow(() => clearAllDrafts(broken))
  const s = memoryStorage()
  s.setItem('forum-draft:k', '{not json')
  assert.equal(readDraft('k', 'u', s), null)
})

test('a form only counts as a draft once it differs from where it started', () => {
  const start = { body: 'Original' }
  assert.equal(isChanged({ body: 'Original' }, [{ id: 'a' }], start, [{ id: 'a' }]), false)
  assert.equal(isChanged({ body: 'Edited' }, [{ id: 'a' }], start, [{ id: 'a' }]), true)
  assert.equal(isChanged({ body: 'Original' }, [], start, [{ id: 'a' }]), true, 'image removed')
  assert.equal(isChanged({ body: 'Original' }, [{ id: 'b' }, { id: 'a' }], start, [{ id: 'a' }, { id: 'b' }]), true, 'reordered')
})

test('429 answers say how long to wait when Retry-After is known', () => {
  const now = Date.parse('2026-11-17T10:00:00Z')
  assert.equal(parseRetryAfter('120'), 120)
  assert.equal(parseRetryAfter(' 10 '), 10)
  assert.equal(parseRetryAfter('Tue, 17 Nov 2026 10:05:00 GMT', now), 300)
  assert.equal(parseRetryAfter('Tue, 17 Nov 2026 09:00:00 GMT', now), 0, 'a date in the past')
  assert.equal(parseRetryAfter(null), null)
  assert.equal(parseRetryAfter('soon'), null)

  assert.equal(waitText(1), 'a second')
  assert.equal(waitText(10), '10 seconds')
  assert.equal(waitText(60), 'a minute')
  assert.equal(waitText(61), '2 minutes')
  assert.equal(waitText(899), '15 minutes')
  assert.equal(waitText(3600), '60 minutes')
  assert.equal(waitText(7200), '2 hours')

  const limited = (message, retryAfter) => Object.assign(new Error(message), { status: 429, retryAfter })
  assert.equal(
    describeError(limited('Too many attempts, try again later', 754)),
    'Too many attempts. Please try again in 13 minutes.',
  )
  assert.equal(
    describeError(limited('Too many uploads at the moment, try again shortly', 10)),
    'Too many uploads at the moment. Please try again in 10 seconds.',
  )
  assert.equal(
    describeError(limited('Too many attempts, try again later', null)),
    'Too many attempts, try again later',
    'header not readable: the API message as it is',
  )
})
