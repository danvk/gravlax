import { MockInstance, vi } from "vitest";

// MockInstance is here to avoid a strange portability error.

export const mockError = (): MockInstance =>
	vi.spyOn(console, "error").mockImplementation(() => undefined);

export const mockLog = () =>
	vi.spyOn(console, "log").mockImplementation(() => undefined);

export const mockExit = () =>
	vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
