import { describe, it, expect } from "vitest";
import { fromKg, KG_TO_LBS, toKg } from "./weight-units";

describe("weight-units", () => {
  it("uses the standard kilogram-to-pound factor", () => {
    expect(KG_TO_LBS).toBe(2.20462262);
  });

  describe("toKg", () => {
    it("converts pounds to kilograms for imperial users", () => {
      expect(toKg(220.462262, false)).toBeCloseTo(100, 6);
      expect(toKg(1, false)).toBeCloseTo(0.45359237, 6);
    });

    it("returns kilograms unchanged for metric users", () => {
      expect(toKg(100, true)).toBe(100);
    });
  });

  describe("fromKg", () => {
    it("converts kilograms to pounds for imperial users", () => {
      expect(fromKg(100, false)).toBeCloseTo(220.462262, 6);
      expect(fromKg(80, false)).toBeCloseTo(176.3698096, 6);
    });

    it("returns kilograms unchanged for metric users", () => {
      expect(fromKg(100, true)).toBe(100);
    });
  });

  it("round-trips a pound value through kilograms", () => {
    expect(fromKg(toKg(185.4, false), false)).toBeCloseTo(185.4, 10);
  });

  it("round-trips a kilogram value through pounds", () => {
    expect(toKg(fromKg(84.1, false), false)).toBeCloseTo(84.1, 10);
  });
});
