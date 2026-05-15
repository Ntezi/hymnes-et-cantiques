import { Platform } from 'react-native';

const WEB_AUDIO_CACHE_NAME = 'hec-audio-cache-v1';
const DEFAULT_WEB_AUDIO_BASE_URL = 'https://ntezi-media.s3.amazonaws.com/hymnes-cantiques/audio';
const WEB_AUDIO_BASE_URL = (process.env.EXPO_PUBLIC_WEB_AUDIO_S3_BASE_URL || DEFAULT_WEB_AUDIO_BASE_URL)
	.trim()
	.replace(/\/+$/, '');
const inFlightPrefetches = new Map<string, Promise<void>>();

const isWebPlatform = Platform.OS === 'web';

const canUseCacheStorage = (): boolean =>
	isWebPlatform
	&& typeof window !== 'undefined'
	&& typeof window.caches !== 'undefined';

const canUseObjectUrls = (): boolean =>
	typeof URL !== 'undefined'
	&& typeof URL.createObjectURL === 'function'
	&& typeof URL.revokeObjectURL === 'function';

const normalizeSongNumberForFile = (songNumber: number | string): string | null => {
	const raw = String(songNumber).trim().toLowerCase();
	if (!raw) {
		return null;
	}

	if (/^\d+$/.test(raw)) {
		return raw.padStart(3, '0');
	}

	return raw;
};

const openAudioCache = async (): Promise<any | null> => {
	if (!canUseCacheStorage()) {
		return null;
	}

	try {
		return await window.caches.open(WEB_AUDIO_CACHE_NAME);
	} catch {
		return null;
	}
};

const fetchAndCacheAudio = async (cache: any, url: string): Promise<Response> => {
	const response = await fetch(url, {
		method: 'GET',
		mode: 'cors',
		cache: 'no-cache',
	});

	if (!response.ok) {
		throw new Error(`Audio fetch failed (${response.status}) for ${url}`);
	}

	await cache.put(url, response.clone());
	return response;
};

export const isWebS3AudioConfigured = (): boolean =>
	WEB_AUDIO_BASE_URL.length > 0;

export const getWebS3AudioUrl = (songNumber: number | string): string | null => {
	if (!isWebPlatform || !isWebS3AudioConfigured()) {
		return null;
	}

	const songToken = normalizeSongNumberForFile(songNumber);
	if (!songToken) {
		return null;
	}

	return `${WEB_AUDIO_BASE_URL}/hec_${songToken}.mp3`;
};

export const preloadWebAudioForOffline = async (url: string): Promise<void> => {
	if (!isWebPlatform || !url) {
		return;
	}

	const cache = await openAudioCache();
	if (!cache) {
		return;
	}

	const pending = inFlightPrefetches.get(url);
	if (pending) {
		return pending;
	}

	const task = (async () => {
		const cached = await cache.match(url);
		if (cached) {
			return;
		}

		await fetchAndCacheAudio(cache, url);
	})()
		.finally(() => {
			inFlightPrefetches.delete(url);
		});

	inFlightPrefetches.set(url, task);
	return task;
};

export const resolveWebAudioPlaybackUri = async (url: string): Promise<string> => {
	if (!isWebPlatform || !url) {
		return url;
	}

	const cache = await openAudioCache();
	if (!cache || !canUseObjectUrls()) {
		return url;
	}

	let response = await cache.match(url);
	if (!response) {
		response = await fetchAndCacheAudio(cache, url);
	}

	const blob = await response.blob();
	return URL.createObjectURL(blob);
};

export const releaseWebAudioPlaybackUri = (uri: string | null | undefined): void => {
	if (!isWebPlatform || !uri || !uri.startsWith('blob:') || !canUseObjectUrls()) {
		return;
	}

	URL.revokeObjectURL(uri);
};
