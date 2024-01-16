import { MockInstance, vi } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockType<Fn extends (...args: any[]) => any> = MockInstance<
	Parameters<Fn>,
	ReturnType<Fn>
>;

export const mockError = () =>
	vi.spyOn(console, "error").mockImplementation(() => undefined);

export const mockLog = () =>
	vi.spyOn(console, "log").mockImplementation(() => undefined);

export const mockExit = () =>
	vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
