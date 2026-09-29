import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  maskPhoneNumber,
} from "../utils/phone.js";

describe("Phone Normalization and Validation", () => {
  it("normalizes a 10-digit Indian mobile number to E.164 (+91)", () => {
    const input = "9876543210";
    const result = normalizePhoneNumber(input);
    assert.equal(result, "+919876543210");
  });

  it("normalizes phone with leading 0", () => {
    const input = "09876543210";
    const result = normalizePhoneNumber(input);
    assert.equal(result, "+919876543210");
  });

  it("normalizes phone with spaces, dashes, and parentheses", () => {
    const input = "+91 (98765) 432-10";
    const result = normalizePhoneNumber(input);
    assert.equal(result, "+919876543210");
  });

  it("validates correct mobile phone formats", () => {
    assert.equal(isValidPhoneNumber("9876543210"), true);
    assert.equal(isValidPhoneNumber("+919876543210"), true);
    assert.equal(isValidPhoneNumber("08765432109"), true);
  });

  it("rejects invalid phone numbers", () => {
    assert.equal(isValidPhoneNumber("12345"), false);
    assert.equal(isValidPhoneNumber("abcdefghij"), false);
    assert.equal(isValidPhoneNumber("0000000000"), false);
    assert.equal(isValidPhoneNumber("01234"), false);
  });

  it("throws ValidationError for malformed phone inputs", () => {
    assert.throws(() => normalizePhoneNumber("invalid"), {
      name: "ValidationError",
    });
    assert.throws(() => normalizePhoneNumber(""), {
      name: "ValidationError",
    });
  });

  it("masks phone numbers safely for logs and notifications", () => {
    const masked = maskPhoneNumber("+919876543210");
    assert.equal(masked, "+91 ******3210");
  });
});
