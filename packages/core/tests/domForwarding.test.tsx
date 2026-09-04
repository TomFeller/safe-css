import { describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { fireEvent } from "@testing-library/react";
import { Box, Stack } from "../src";
import { renderWithTheme } from "./test-utils";

describe("common primitive contract: DOM forwarding", () => {
  it("forwards `id`", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" id="hero" />);
    expect(getByTestId("el").id).toBe("hero");
  });

  it("forwards aria-* attributes", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid="el" aria-label="Close" aria-hidden="true" />,
    );
    const el = getByTestId("el");
    expect(el.getAttribute("aria-label")).toBe("Close");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("forwards arbitrary data-* attributes", () => {
    const { getByTestId } = renderWithTheme(<Box data-testid="el" data-analytics-id="card-42" />);
    expect(getByTestId("el").getAttribute("data-analytics-id")).toBe("card-42");
  });

  it("forwards event handlers and they fire normally", () => {
    const onClick = vi.fn();
    const { getByTestId } = renderWithTheme(<Box data-testid="el" onClick={onClick} />);
    fireEvent.click(getByTestId("el"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders native semantic HTML via `as` without adding ARIA roles automatically", () => {
    const { getByTestId } = renderWithTheme(<Stack as="nav" data-testid="el" />);
    const el = getByTestId("el");
    expect(el.tagName).toBe("NAV");
    expect(el.getAttribute("role")).toBeNull();
  });

  it("forwards refs to the actual DOM node for both Box and Stack", () => {
    const boxRef = createRef<HTMLDivElement>();
    const navRef = createRef<HTMLElement>();
    renderWithTheme(
      <>
        <Box ref={boxRef} />
        <Stack as="nav" ref={navRef} />
      </>,
    );
    expect(boxRef.current?.tagName).toBe("DIV");
    expect(navRef.current?.tagName).toBe("NAV");
  });

  it("renders children", () => {
    const { getByText } = renderWithTheme(
      <Box>
        <span>hello world</span>
      </Box>,
    );
    expect(getByText("hello world")).toBeTruthy();
  });
});
