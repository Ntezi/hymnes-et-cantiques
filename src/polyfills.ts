// react-native-gesture-handler's web implementation calls setImmediate, which browsers don't provide.
// Without this, opening a hymn on web throws "setImmediate is not defined" and renders a blank page.
const g = globalThis as any;
if (typeof g.setImmediate === 'undefined') {
	g.setImmediate = (fn: (...args: unknown[]) => void, ...args: unknown[]) => setTimeout(fn, 0, ...args);
	g.clearImmediate = (id: ReturnType<typeof setTimeout>) => clearTimeout(id);
}

export {};
