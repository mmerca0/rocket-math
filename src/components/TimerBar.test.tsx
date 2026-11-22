import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TimerBar } from "./TimerBar";

afterEach(cleanup);

function bar(timeLeftMs: number) {
  render(<TimerBar timeLeftMs={timeLeftMs} totalMs={120_000} />);
  const el = screen.getByTestId("timer-bar");
  return { el, fill: el.firstElementChild as HTMLElement };
}

describe("TimerBar", () => {
  it("is full and green at the start, without pulsing", () => {
    const { el, fill } = bar(120_000);
    expect(fill.style.transform).toBe("scaleX(1)");
    expect(el.dataset.color).toBe("green");
    expect(el.className).not.toContain("timer-pulse");
  });

  it("is a quarter full and yellow with 30 seconds left", () => {
    const { el, fill } = bar(30_000);
    expect(fill.style.transform).toBe("scaleX(0.25)");
    expect(el.dataset.color).toBe("yellow");
  });

  it("is red and pulses in the last 10 seconds", () => {
    const { el, fill } = bar(8_000);
    expect(el.dataset.color).toBe("red");
    expect(el.className).toContain("timer-pulse");
    // #fb7c7c, as the browser reports it
    expect(fill.style.backgroundColor).toBe("rgb(251, 124, 124)");
  });
});
