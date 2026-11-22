import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { site } from "@/config/site";
import { STORAGE_KEY } from "@/game/storage";
import { resetSaveCacheForTests } from "@/lib/useSaveData";
import Home from "./page";

beforeEach(() => {
  window.localStorage.clear();
  resetSaveCacheForTests();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Math Rocket", () => {
  it("shows the app name and asks who is flying", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      site.name,
    );
    expect(screen.getByText(/who's flying today/i)).toBeTruthy();
  });

  it("adds a pilot, saves them on the device and shows the planet map", () => {
    render(<Home />);
    fireEvent.change(screen.getByLabelText(/new pilot name/i), {
      target: { value: "Leo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add pilot/i }));

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Leo");
    expect(screen.getByRole("button", { name: /play level 1/i })).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: /level 2, locked/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(saved.players[0].name).toBe("Leo");
  });

  it("starts a round with a problem and four answer asteroids", () => {
    render(<Home />);
    fireEvent.change(screen.getByLabelText(/new pilot name/i), {
      target: { value: "Leo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add pilot/i }));
    fireEvent.click(screen.getByRole("button", { name: /play level 1/i }));

    expect(
      screen.getAllByRole("button", { name: /^answer \d+$/i }),
    ).toHaveLength(4);
    expect(
      screen.getByRole("region", { name: /problem/i }).textContent,
    ).toMatch(/\d+ \+ \d+/);
  });
});

describe("family leaderboard", () => {
  it("asks for the family code once; 'Not now' hides it for good", () => {
    render(<Home />);
    expect(screen.getByText(/share scores with your family/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /not now/i }));
    expect(screen.queryByText(/share scores with your family/i)).toBeNull();

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(saved.familyPromptDismissed).toBe(true);
    expect(saved.familyCode).toBeNull();
  });

  it("never blocks play when the server can't be reached", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError("offline")));
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);

    fireEvent.change(screen.getByLabelText(/family code/i), {
      target: { value: "moon-pie-42" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save code/i }));
    fireEvent.change(screen.getByLabelText(/new pilot name/i), {
      target: { value: "Leo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add pilot/i }));
    fireEvent.click(screen.getByRole("button", { name: /play level 1/i }));

    // The round started even though every request fails.
    expect(
      screen.getAllByRole("button", { name: /^answer \d+$/i }),
    ).toHaveLength(4);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(saved.familyCode).toBe("moon-pie-42");
    expect(saved.players[0].name).toBe("Leo");
  });
});
