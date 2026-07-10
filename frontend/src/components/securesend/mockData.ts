import type { SecureMessage } from "./types";

const now = Date.now();
const inFuture = (mins: number) => new Date(now + mins * 60_000).toISOString();
const inPast = (mins: number) => new Date(now - mins * 60_000).toISOString();

export const initialMessages: SecureMessage[] = [];
