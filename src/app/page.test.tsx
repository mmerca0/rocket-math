import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { site } from "@/config/site";
import Home from "./page";

describe("Home page", () => {
  it("shows the app name as the main heading", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe(site.name);
  });
});
