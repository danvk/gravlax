import { vi } from "vitest";

export const mockError = () =>
	vi.spyOn(console, "error").mockImplementation(() => undefined);

export const mockLog = () =>
	vi.spyOn(console, "log").mockImplementation(() => undefined);

export const mockExit = () =>
	vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
