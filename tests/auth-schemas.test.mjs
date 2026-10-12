import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updateProfileSchema,
} from '../src/features/auth/schemas.ts';

test('sign-in schema accepts valid credentials', () => {
  assert.equal(
    signInSchema.safeParse({ email: 'student@kmutt.ac.th', password: 'secret' }).success,
    true
  );
});

test('sign-in schema rejects malformed email and empty password', () => {
  assert.equal(signInSchema.safeParse({ email: 'not-an-email', password: 'secret' }).success, false);
  assert.equal(signInSchema.safeParse({ email: 'student@kmutt.ac.th', password: '' }).success, false);
});

test('sign-up schema trims valid identity fields', () => {
  const result = signUpSchema.safeParse({
    email: '  student@kmutt.ac.th ',
    password: 'secret123',
    name: ' Student ',
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.email, 'student@kmutt.ac.th');
    assert.equal(result.data.name, 'Student');
  }
});

test('sign-up schema rejects short passwords and names', () => {
  assert.equal(
    signUpSchema.safeParse({ email: 'student@kmutt.ac.th', password: 'short', name: 'Student' }).success,
    false
  );
  assert.equal(
    signUpSchema.safeParse({ email: 'student@kmutt.ac.th', password: 'secret123', name: 'S' }).success,
    false
  );
});

test('reset-password schema requires matching passwords', () => {
  const valid = { password: 'secure123', confirmPassword: 'secure123' };
  assert.equal(resetPasswordSchema.safeParse(valid).success, true);
  assert.equal(
    resetPasswordSchema.safeParse({ ...valid, confirmPassword: 'different123' }).success,
    false
  );
});

test('profile schema accepts an optional avatar URL and rejects malformed URLs', () => {
  assert.equal(updateProfileSchema.safeParse({ name: 'Student', avatar_url: null }).success, true);
  assert.equal(updateProfileSchema.safeParse({ name: 'Student', avatar_url: 'not-a-url' }).success, false);
});
