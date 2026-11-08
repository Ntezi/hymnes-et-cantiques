// Run: node scripts/tests/audioService.test.mjs
// Checks that rapid load/unload calls never leave more than one Sound loaded.
// expo-av is replaced by a stub through a resolve hook, so no new dependency is needed.
import assert from 'node:assert/strict';
import { register } from 'node:module';

const stub = `
export const stats = { live: 0, maxLive: 0, created: 0 };
const delay = (ms) => new Promise(r => setTimeout(r, ms));
export const Audio = {
	setAudioModeAsync: async () => {},
	Sound: class {
		constructor() { stats.created += 1; this.loaded = false; }
		setOnPlaybackStatusUpdate() {}
		async loadAsync() { await delay(Math.random() * 15); this.loaded = true; stats.live += 1; stats.maxLive = Math.max(stats.maxLive, stats.live); return { isLoaded: true }; }
		async unloadAsync() { await delay(Math.random() * 15); if (this.loaded) { this.loaded = false; stats.live -= 1; } }
		async playAsync() {} async pauseAsync() {} async stopAsync() {} async setPositionAsync() {}
	},
};`;
const stubUrl = 'data:text/javascript,' + encodeURIComponent(stub);
const hooks = `
export async function resolve(specifier, context, next) {
	if (specifier === 'expo-av') return { url: ${JSON.stringify(stubUrl)}, shortCircuit: true };
	return next(specifier, context);
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));

const { audioService } = await import('../../src/services/audioService.ts');
const { stats } = await import(stubUrl);

// 20 rapid "hymn changes": each loads (fire and forget) then its owner unloads.
const jobs = [];
for (let i = 0; i < 20; i += 1) {
	jobs.push(audioService.loadAsync(1, true, `screen-${i}`));
	if (i % 2 === 0) jobs.push(audioService.unloadAsync(`screen-${i}`));
}
await Promise.all(jobs);
assert.equal(stats.maxLive, 1, 'never more than one Sound loaded at a time');

// An old screen unloading must not kill audio now owned by another screen.
await audioService.loadAsync(1, true, 'screen-B');
await audioService.unloadAsync('screen-A');
assert.equal(stats.live, 1, 'screen-A cannot unload screen-B audio');
await audioService.unloadAsync('screen-B');
assert.equal(stats.live, 0, 'owner can unload its own audio');

console.log('audioService tests passed (created', stats.created, 'Sounds, max live', stats.maxLive + ')');
