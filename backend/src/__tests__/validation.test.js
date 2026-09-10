/**
 * backend/src/__tests__/validation.test.js
 *
 * Phase 26: Unit tests for request payload validation utilities.
 * Tests: validateRegisterInput, validateLoginInput
 */

const { validateRegisterInput, validateLoginInput } = require('../../src/utils/validation');

describe('validateRegisterInput', () => {
  it('passes with valid name, email, and password', () => {
    const result = validateRegisterInput({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'securepass'
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing name', () => {
    const result = validateRegisterInput({ name: '', email: 'a@b.com', password: 'pass123' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Name is required.');
  });

  it('rejects name that is only whitespace', () => {
    const result = validateRegisterInput({ name: '   ', email: 'a@b.com', password: 'pass123' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Name is required.');
  });

  it('rejects invalid email format', () => {
    const result = validateRegisterInput({ name: 'Bob', email: 'notanemail', password: 'pass123' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('A valid email address is required.');
  });

  it('rejects email missing domain', () => {
    const result = validateRegisterInput({ name: 'Bob', email: 'bob@', password: 'pass123' });
    expect(result.isValid).toBe(false);
  });

  it('rejects password shorter than 6 characters', () => {
    const result = validateRegisterInput({ name: 'Bob', email: 'b@b.com', password: 'abc' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 6 characters long.');
  });

  it('rejects missing password', () => {
    const result = validateRegisterInput({ name: 'Bob', email: 'b@b.com', password: undefined });
    expect(result.isValid).toBe(false);
  });

  it('accumulates multiple errors', () => {
    const result = validateRegisterInput({ name: '', email: 'bad', password: 'ab' });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateLoginInput', () => {
  it('passes with valid email and password', () => {
    const result = validateLoginInput({ email: 'user@example.com', password: 'mypass' });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invalid email format', () => {
    const result = validateLoginInput({ email: 'notvalid', password: 'mypass' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('A valid email address is required.');
  });

  it('rejects missing password', () => {
    const result = validateLoginInput({ email: 'u@u.com', password: undefined });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password is required.');
  });

  it('rejects null password', () => {
    const result = validateLoginInput({ email: 'u@u.com', password: null });
    expect(result.isValid).toBe(false);
  });

  it('allows short passwords for login (only registers enforce minimum length)', () => {
    // login validation does NOT enforce min length, only presence
    const result = validateLoginInput({ email: 'u@u.com', password: 'a' });
    expect(result.isValid).toBe(true);
  });
});
