#!/usr/bin/env node
/**
 * Find hymns that share a melody by comparing the piano renders in /audio.
 *
 *   npm run analyze:melody-groups            # prints candidate groups + a review table
 *   npm run analyze:melody-groups -- --write # also rewrites src/melodyGroups.json
 *
 * How it works (no dependencies beyond Node and macOS `afconvert`):
 *   1. Each mp3 is decoded to 8 kHz mono PCM.
 *   2. A pitch track is extracted per 64 ms frame (FFT + harmonic product spectrum).
 *   3. Stage 1 (cheap): songs are compared as note-interval sequences to find candidate pairs.
 *   4. Stage 2 (robust): candidate pairs are compared with dynamic time warping over
 *      pitch classes, trying all 12 transpositions, so tempo and key differences do not matter.
 *   5. Pairs with DTW >= LINK_MIN are linked; a group is kept only if every pair inside it
 *      scores >= GROUP_MIN. Random, unrelated pairs never score above ~0.80.
 *
 * Options: --audio <dir> (default ./audio)  --seconds <n> (default 40, opening window)
 *          --link-min <x> (0.875)  --group-min <x> (0.84)  --write
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const AUDIO_DIR = path.resolve(repoRoot, opt('--audio', 'audio'));
const SECONDS = Number(opt('--seconds', 40));
const LINK_MIN = Number(opt('--link-min', 0.875));
const GROUP_MIN = Number(opt('--group-min', 0.84));
const PC_MIN = 0.6;
const WRITE = args.includes('--write');
const OUTPUT = path.join(repoRoot, 'src', 'melodyGroups.json');

const SAMPLE_RATE = 8000;
const FRAME = 4096;
const HOP = 512;
const MIN_HZ = 110;
const MAX_HZ = 1400;
const MIN_NOTE_FRAMES = 3;

// ---------- audio decoding ----------

const decodeToPcm = (mp3Path, wavDir) => {
	const wavPath = path.join(wavDir, `${path.basename(mp3Path, '.mp3')}.wav`);
	if (!fs.existsSync(wavPath)) {
		execFileSync('afconvert', ['-f', 'WAVE', '-d', `LEI16@${SAMPLE_RATE}`, '-c', '1', mp3Path, wavPath]);
	}
	const buf = fs.readFileSync(wavPath);
	let pos = 12;
	let data = null;
	while (pos + 8 <= buf.length) {
		const id = buf.toString('ascii', pos, pos + 4);
		const size = buf.readUInt32LE(pos + 4);
		if (id === 'data') {
			data = buf.subarray(pos + 8, Math.min(buf.length, pos + 8 + size));
		}
		pos += 8 + size + (size & 1);
	}
	const n = Math.floor(data.length / 2);
	const samples = new Float32Array(n);
	for (let i = 0; i < n; i++) samples[i] = data.readInt16LE(i * 2) / 32768;
	return samples;
};

// ---------- pitch tracking ----------

const fft = (re, im) => {
	const n = re.length;
	for (let i = 1, j = 0; i < n; i++) {
		let bit = n >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			[re[i], re[j]] = [re[j], re[i]];
			[im[i], im[j]] = [im[j], im[i]];
		}
	}
	for (let len = 2; len <= n; len <<= 1) {
		const ang = -2 * Math.PI / len;
		const wr = Math.cos(ang);
		const wi = Math.sin(ang);
		const half = len >> 1;
		for (let i = 0; i < n; i += len) {
			let cr = 1;
			let ci = 0;
			for (let j = 0; j < half; j++) {
				const a = i + j;
				const b = a + half;
				const vr = re[b] * cr - im[b] * ci;
				const vi = re[b] * ci + im[b] * cr;
				re[b] = re[a] - vr;
				im[b] = im[a] - vi;
				re[a] += vr;
				im[a] += vi;
				const ncr = cr * wr - ci * wi;
				ci = cr * wi + ci * wr;
				cr = ncr;
			}
		}
	}
};

const hann = new Float32Array(FRAME);
for (let i = 0; i < FRAME; i++) hann[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FRAME - 1));

/** MIDI note number per frame (null = silence), median-filtered. */
const pitchTrack = (samples) => {
	const re = new Float64Array(FRAME);
	const im = new Float64Array(FRAME);
	const binHz = SAMPLE_RATE / FRAME;
	const minBin = Math.floor(MIN_HZ / binHz);
	const maxBin = Math.ceil(MAX_HZ / binHz);
	const freqs = [];
	const rmsArr = [];
	let maxRms = 0;
	for (let start = 0; start + FRAME <= samples.length; start += HOP) {
		let energy = 0;
		for (let i = 0; i < FRAME; i++) {
			const s = samples[start + i];
			energy += s * s;
			re[i] = s * hann[i];
			im[i] = 0;
		}
		const rms = Math.sqrt(energy / FRAME);
		rmsArr.push(rms);
		if (rms > maxRms) maxRms = rms;
		fft(re, im);
		const mag = new Float64Array(FRAME / 2);
		for (let i = 0; i < FRAME / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
		let bestBin = minBin;
		let bestVal = -1;
		for (let b = minBin; b <= maxBin; b++) {
			let v = mag[b];
			if (2 * b < mag.length) v *= mag[2 * b];
			if (3 * b < mag.length) v *= mag[3 * b];
			if (v > bestVal) {
				bestVal = v;
				bestBin = b;
			}
		}
		let f = bestBin * binHz;
		const a = mag[bestBin - 1];
		const b0 = mag[bestBin];
		const c = mag[bestBin + 1];
		const denom = a - 2 * b0 + c;
		if (denom !== 0) f = (bestBin + 0.5 * (a - c) / denom) * binHz;
		freqs.push(f);
	}
	const midi = freqs.map((f, i) => (rmsArr[i] < maxRms * 0.04 || f <= 0 ? null : Math.round(69 + 12 * Math.log2(f / 440))));
	return midi.map((v, i) => {
		const w = [midi[i - 1], v, midi[i + 1]].filter((x) => x !== null && x !== undefined);
		if (w.length === 0) return null;
		w.sort((x, y) => x - y);
		return w[Math.floor(w.length / 2)];
	});
};

const toNotes = (frames) => {
	const notes = [];
	let cur = null;
	let len = 0;
	for (const m of [...frames, undefined]) {
		if (m === cur) {
			len++;
			continue;
		}
		if (cur !== null && cur !== undefined && len >= MIN_NOTE_FRAMES) {
			if (notes.length && notes[notes.length - 1] === cur) {
				// glitch inside a held note
			} else {
				notes.push(cur);
			}
		}
		cur = m;
		len = 1;
	}
	return notes;
};

const foldInterval = (d) => {
	let x = ((d % 12) + 12) % 12;
	if (x > 6) x -= 12;
	return x;
};

const levenshtein = (a, b) => {
	const m = a.length;
	const n = b.length;
	let prev = new Array(n + 1);
	let cur = new Array(n + 1);
	for (let j = 0; j <= n; j++) prev[j] = j;
	for (let i = 1; i <= m; i++) {
		cur[0] = i;
		for (let j = 1; j <= n; j++) {
			cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
		}
		[prev, cur] = [cur, prev];
	}
	return prev[n];
};

const seqSimilarity = (seqA, seqB, K) => {
	let best = 0;
	for (let oa = 0; oa <= 4; oa++) {
		for (let ob = 0; ob <= 4; ob++) {
			const a = seqA.slice(oa, oa + K);
			const b = seqB.slice(ob, ob + K);
			if (a.length < 12 || b.length < 12) continue;
			best = Math.max(best, 1 - levenshtein(a, b) / Math.max(a.length, b.length));
		}
	}
	return best;
};

const intervalSimilarity = (notesA, notesB) => {
	const iv = (notes) => notes.slice(1).map((n, i) => foldInterval(n - notes[i]));
	return seqSimilarity(iv(notesA), iv(notesB), 48);
};

const pitchClassSimilarity = (notesA, notesB) => {
	const pa = notesA.map((m) => ((m % 12) + 12) % 12);
	let best = 0;
	for (let r = 0; r < 12; r++) {
		const pb = notesB.map((m) => (((m + r) % 12) + 12) % 12);
		best = Math.max(best, seqSimilarity(pa, pb, 60));
	}
	return best;
};

/** DTW similarity over frame-level pitch classes, best of 12 transpositions. */
const dtwSimilarity = (fa, fb) => {
	const n = fa.length;
	const m = fb.length;
	const band = Math.ceil(Math.max(n, m) * 0.35);
	let best = 0;
	for (let r = 0; r < 12; r++) {
		const fbr = fb.map((b) => (b < 0 ? -1 : (b + r) % 12));
		let prev = new Float64Array(m + 1).fill(Infinity);
		let cur = new Float64Array(m + 1).fill(Infinity);
		let prevLen = new Int32Array(m + 1);
		let curLen = new Int32Array(m + 1);
		prev[0] = 0;
		for (let i = 1; i <= n; i++) {
			cur.fill(Infinity);
			const jlo = Math.max(1, i - band);
			const jhi = Math.min(m, i + band);
			for (let j = jlo; j <= jhi; j++) {
				const c = fa[i - 1] === fbr[j - 1] ? 0 : 1;
				let m0 = prev[j - 1];
				let l0 = prevLen[j - 1];
				if (prev[j] < m0) { m0 = prev[j]; l0 = prevLen[j]; }
				if (cur[j - 1] < m0) { m0 = cur[j - 1]; l0 = curLen[j - 1]; }
				cur[j] = m0 + c;
				curLen[j] = l0 + 1;
			}
			[prev, cur] = [cur, prev];
			[prevLen, curLen] = [curLen, prevLen];
		}
		if (Number.isFinite(prev[m])) best = Math.max(best, 1 - prev[m] / prevLen[m]);
	}
	return best;
};

// ---------- main ----------

const run = () => {
	const files = fs.readdirSync(AUDIO_DIR).filter((f) => /^hec_(\d{3})\.mp3$/i.test(f)).sort();
	if (files.length === 0) throw new Error(`No hec_NNN.mp3 files in ${AUDIO_DIR}`);
	const wavDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hec-melody-'));
	console.error(`Decoding ${files.length} files (temp: ${wavDir})`);

	const songs = {};
	const openingFrames = Math.ceil(SECONDS * SAMPLE_RATE / HOP);
	files.forEach((file, index) => {
		const number = Number(file.match(/(\d{3})/)[1]);
		const frames = pitchTrack(decodeToPcm(path.join(AUDIO_DIR, file), wavDir));
		const pcs = frames.map((m) => (m === null ? -1 : ((m % 12) + 12) % 12));
		let first = pcs.findIndex((p) => p >= 0);
		if (first < 0) first = 0;
		songs[number] = {
			notes: toNotes(frames),
			opening: pcs.slice(first, first + openingFrames),
		};
		if ((index + 1) % 25 === 0) console.error(`  analyzed ${index + 1}/${files.length}`);
	});

	const numbers = Object.keys(songs).map(Number).sort((a, b) => a - b);
	console.error('Stage 1: note-sequence prefilter');
	const candidates = [];
	for (let i = 0; i < numbers.length; i++) {
		for (let j = i + 1; j < numbers.length; j++) {
			const a = songs[numbers[i]];
			const b = songs[numbers[j]];
			const iv = intervalSimilarity(a.notes, b.notes);
			if (iv < 0.4) continue;
			const pc = pitchClassSimilarity(a.notes, b.notes);
			if (Math.max(iv, pc) >= 0.5) candidates.push({ a: numbers[i], b: numbers[j], iv, pc });
		}
	}

	console.error(`Stage 2: DTW on ${candidates.length} candidate pairs`);
	candidates.forEach((pair) => {
		pair.dtw = dtwSimilarity(songs[pair.a].opening, songs[pair.b].opening);
	});
	const scoreOf = new Map(candidates.map((p) => [`${p.a}-${p.b}`, p.dtw]));
	const score = (a, b) => scoreOf.get(`${Math.min(a, b)}-${Math.max(a, b)}`) || 0;

	// union-find on linking pairs
	const parent = new Map();
	const find = (x) => {
		if (!parent.has(x)) parent.set(x, x);
		while (parent.get(x) !== x) {
			parent.set(x, parent.get(parent.get(x)));
			x = parent.get(x);
		}
		return x;
	};
	candidates
		.filter((p) => p.dtw >= LINK_MIN && p.pc >= PC_MIN)
		.forEach((p) => parent.set(find(p.a), find(p.b)));
	const components = new Map();
	for (const n of parent.keys()) {
		const root = find(n);
		if (!components.has(root)) components.set(root, new Set());
		components.get(root).add(n);
	}

	const groups = [];
	const dropped = [];
	for (const members of components.values()) {
		const m = new Set(members);
		const pairsOf = (set) => {
			const arr = [...set];
			const out = [];
			for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]);
			return out;
		};
		while (m.size >= 2 && pairsOf(m).some(([a, b]) => score(a, b) < GROUP_MIN)) {
			const weakest = [...m].reduce((worst, x) => {
				const mean = [...m].filter((y) => y !== x).reduce((acc, y) => acc + score(x, y), 0) / (m.size - 1);
				return !worst || mean < worst.mean ? { x, mean } : worst;
			}, null);
			dropped.push({ song: weakest.x, from: [...m].filter((y) => y !== weakest.x).sort((a, b) => a - b) });
			m.delete(weakest.x);
		}
		if (m.size >= 2) groups.push([...m].sort((a, b) => a - b));
	}
	groups.sort((x, y) => x[0] - y[0]);

	console.log('# Same-melody groups (min = weakest pair inside the group)');
	groups.forEach((g) => {
		let min = 1;
		for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) min = Math.min(min, score(g[i], g[j]));
		console.log(`${JSON.stringify(g)}  min=${min.toFixed(3)} ${min >= 0.97 ? 'identical' : 'strong'}`);
	});
	if (dropped.length) {
		console.log('\n# Dropped for inconsistency inside their group');
		dropped.forEach((d) => console.log(`${d.song} (from ${JSON.stringify(d.from)})`));
	}
	const borderline = candidates
		.filter((p) => p.dtw >= 0.84 && p.dtw < LINK_MIN && p.pc >= PC_MIN)
		.sort((x, y) => y.dtw - x.dtw);
	if (borderline.length) {
		console.log('\n# Borderline pairs (not linked; worth checking by ear)');
		borderline.forEach((p) => console.log(`${p.a}-${p.b}  dtw=${p.dtw.toFixed(3)}`));
	}

	if (WRITE) {
		const existing = fs.existsSync(OUTPUT) ? JSON.parse(fs.readFileSync(OUTPUT, 'utf8')) : {};
		const description = existing.description
			|| 'Hymns sung to the same melody. Generated by scripts/analyze-melody-groups.mjs; edit by hand to correct.';
		const body = `{\n  "description": ${JSON.stringify(description)},\n  "groups": [\n${groups.map((g) => `    [${g.join(', ')}]`).join(',\n')}\n  ]\n}\n`;
		fs.writeFileSync(OUTPUT, body);
		console.log(`\nWrote ${groups.length} groups to ${path.relative(repoRoot, OUTPUT)}`);
	}
	fs.rmSync(wavDir, { recursive: true, force: true });
};

run();
