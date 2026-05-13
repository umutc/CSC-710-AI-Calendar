import { describe, expect, it } from "vitest";
import { inferPriorityFromText } from "../src/lib/priorityInference";

describe("inferPriorityFromText", () => {
  it("returns urgent for ASAP keywords", () => {
    expect(inferPriorityFromText("Finish report ASAP")).toBe("urgent");
    expect(inferPriorityFromText("urgent: send email")).toBe("urgent");
    expect(inferPriorityFromText("critical bug fix")).toBe("urgent");
    expect(inferPriorityFromText("Emergency call mom")).toBe("urgent");
    expect(inferPriorityFromText("Pay rent right now")).toBe("urgent");
  });

  it("returns high for important/priority keywords", () => {
    expect(inferPriorityFromText("Important: book flight")).toBe("high");
    expect(inferPriorityFromText("Top priority — review PR")).toBe("high");
    expect(inferPriorityFromText("Must remember birthday")).toBe("high");
  });

  it("returns low for backlog keywords", () => {
    expect(inferPriorityFromText("Read book someday")).toBe("low");
    expect(inferPriorityFromText("Maybe learn rust")).toBe("low");
    expect(inferPriorityFromText("Eventually deep-clean garage")).toBe("low");
    expect(inferPriorityFromText("Re-org photos whenever")).toBe("low");
  });

  it("returns null for plain text with no keywords", () => {
    expect(inferPriorityFromText("Buy milk")).toBeNull();
    expect(inferPriorityFromText("Call dentist")).toBeNull();
    expect(inferPriorityFromText("Workout")).toBeNull();
  });

  it("urgent takes precedence over high", () => {
    expect(inferPriorityFromText("urgent and important")).toBe("urgent");
  });

  it("high takes precedence over low", () => {
    expect(inferPriorityFromText("important someday")).toBe("high");
  });

  it("is case-insensitive", () => {
    expect(inferPriorityFromText("ASAP")).toBe("urgent");
    expect(inferPriorityFromText("Asap")).toBe("urgent");
    expect(inferPriorityFromText("asap")).toBe("urgent");
  });

  it("matches whole words only", () => {
    expect(inferPriorityFromText("urgentcare appointment")).toBeNull();
    expect(inferPriorityFromText("eventually")).toBe("low");
    expect(inferPriorityFromText("eventualization study")).toBeNull();
  });
});
