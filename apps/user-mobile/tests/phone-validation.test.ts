import assert from "node:assert/strict";
import test from "node:test";

import {
  maskPhoneNumber,
  validatePhoneNumber,
} from "../src/features/auth/utils/phone-validation";

test("phone-validation: validates 10-digit Indian mobile number", () => {
  const result = validatePhoneNumber("9876543210");
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.normalizedValue, "+919876543210");
  }
});

test("phone-validation: validates and preserves E.164 formatted number", () => {
  const result = validatePhoneNumber("+919876543210");
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.normalizedValue, "+919876543210");
  }
});

test("phone-validation: handles formatting spaces and dashes", () => {
  const result = validatePhoneNumber(" 98765-43210 ");
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.normalizedValue, "+919876543210");
  }
});

test("phone-validation: rejects empty input", () => {
  const result = validatePhoneNumber("");
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.message, /enter your phone number/i);
  }
});

test("phone-validation: rejects letters and invalid characters", () => {
  const result = validatePhoneNumber("98765abcde");
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.message, /only contain digits/i);
  }
});

test("phone-validation: rejects numbers that are too short", () => {
  const result = validatePhoneNumber("12345");
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.message, /valid 10-digit/i);
  }
});

test("phone-validation: masks phone number for privacy-safe display", () => {
  const masked = maskPhoneNumber("+919876543210");
  assert.equal(masked, "+91 ******3210");
});

test("phone-validation: handles short numbers in masking gracefully", () => {
  assert.equal(maskPhoneNumber("123"), "123");
  assert.equal(maskPhoneNumber(""), "***");
});
