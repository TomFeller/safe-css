import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { _resetDiagnosticsForTests } from "../src/diagnostics/warn";

afterEach(() => {
  cleanup();
  _resetDiagnosticsForTests();
});
