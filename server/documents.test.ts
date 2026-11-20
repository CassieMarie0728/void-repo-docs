import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentType } from '../src/types.ts';
import { DOCUMENT_PROFILES, documentInstructions } from './documents.ts';

test('every supported document has an audience, purpose and depth', () => {
  assert.deepEqual(Object.keys(DOCUMENT_PROFILES).sort(), Object.values(DocumentType).sort());
  for (const type of Object.values(DocumentType)) {
    const profile = DOCUMENT_PROFILES[type];
    assert.ok(profile.audience && profile.purpose && profile.depth, type);
  }
});

test('readers, operators and legal reviewers receive different tasks independent of tone', () => {
  assert.match(documentInstructions(DocumentType.Readme), /newcomer/);
  assert.match(documentInstructions(DocumentType.Readme), /primary user workflow/);
  assert.match(documentInstructions(DocumentType.Deployment), /rollback/);
  assert.match(documentInstructions(DocumentType.PrivacyPolicy), /retention/);
  assert.equal(DOCUMENT_PROFILES[DocumentType.Readme].legal, undefined);
  assert.equal(DOCUMENT_PROFILES[DocumentType.PrivacyPolicy].legal, true);
  assert.match(documentInstructions(DocumentType.Codeowners), /native syntax/);
  assert.match(documentInstructions(), /Preserve the existing document purpose/);
});
