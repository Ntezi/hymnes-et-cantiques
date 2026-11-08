import { Audio } from 'expo-av';
import type { AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';

type PlaybackStatusListener = (status: AVPlaybackStatusSuccess) => void;

export const PLAYBACK_POLL_INTERVAL_MS = 250;
// Faster status updates while the follow-along lyrics are on.
export const FOLLOW_ALONG_POLL_INTERVAL_MS = 100;

// A load that never settles (stalled decoder, web media element that never fires) must not
// block every later load and unload behind it.
export const LOAD_TIMEOUT_MS = 15000;

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
	new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message)), ms);
		promise.then(
			(value) => { clearTimeout(timer); resolve(value); },
			(error) => { clearTimeout(timer); reject(error); }
		);
	});

export class AudioService {
	private readonly timeoutMs: number;

	constructor(timeoutMs = LOAD_TIMEOUT_MS) {
		this.timeoutMs = timeoutMs;
	}

	private sound: Audio.Sound | null = null;
	private statusListener: PlaybackStatusListener | null = null;
	// Screen that currently owns the Sound; lets a screen unload only its own audio.
	private owner: string | null = null;
	// Load/unload calls run one after another, so two rapid loads can never leave an orphan Sound.
	private queue: Promise<unknown> = Promise.resolve();

	private enqueue<T>(task: () => Promise<T>): Promise<T> {
		const run = this.queue.then(task, task);
		this.queue = run.catch(() => undefined);
		return run;
	}

	private emitLoadedStatus = (status: AVPlaybackStatus) => {
		if (!status.isLoaded || !this.statusListener) {
			return;
		}

		this.statusListener(status);
	};

	setStatusListener(listener: PlaybackStatusListener | null) {
		this.statusListener = listener;
	}

	async configureAsync() {
		await Audio.setAudioModeAsync({
			allowsRecordingIOS: false,
			playsInSilentModeIOS: true,
			staysActiveInBackground: false,
			shouldDuckAndroid: true,
			playThroughEarpieceAndroid: false,
		});
	}

	loadAsync(
		source: string | { uri: string } | number,
		shouldPlay = false,
		owner: string | null = null,
		listener: PlaybackStatusListener | null = null,
		pollIntervalMs = PLAYBACK_POLL_INTERVAL_MS,
		// Checked after the load, inside the queue; false means the caller left, so skip playing.
		canPlay: () => boolean = () => true
	): Promise<AVPlaybackStatus> {
		return this.enqueue(async () => {
			await this.unloadNowAsync();
			await this.configureAsync();

			const sound = new Audio.Sound();
			this.sound = sound;
			this.owner = owner;
			this.statusListener = listener;
			sound.setOnPlaybackStatusUpdate(this.emitLoadedStatus);

			const loadSource = typeof source === 'string' ? { uri: source } : source;

			try {
				const status = await withTimeout(
					sound.loadAsync(
						loadSource,
						{
							shouldPlay: false,
							positionMillis: 0,
							progressUpdateIntervalMillis: pollIntervalMs,
						}
					),
					this.timeoutMs,
					'Audio load timed out'
				);
				if (shouldPlay && status.isLoaded && this.sound === sound && canPlay()) {
					return await withTimeout(sound.playAsync(), this.timeoutMs, 'Audio play timed out');
				}
				return status;
			} catch (error) {
				await this.unloadNowAsync();
				throw error;
			}
		});
	}

	async setFollowAlongPollingAsync(enabled: boolean) {
		if (!this.sound) {
			return;
		}

		await this.sound.setProgressUpdateIntervalAsync(
			enabled ? FOLLOW_ALONG_POLL_INTERVAL_MS : PLAYBACK_POLL_INTERVAL_MS
		);
	}

	async playAsync() {
		if (!this.sound) {
			return;
		}

		await this.sound.playAsync();
	}

	async pauseAsync() {
		if (!this.sound) {
			return;
		}

		await this.sound.pauseAsync();
	}

	async stopAsync() {
		if (!this.sound) {
			return;
		}

		await this.sound.stopAsync();
		await this.sound.setPositionAsync(0);
	}

	async seekToAsync(positionMs: number) {
		if (!this.sound) {
			return;
		}

		await this.sound.setPositionAsync(Math.max(0, positionMs));
	}

	async getStatusAsync(): Promise<AVPlaybackStatus | null> {
		if (!this.sound) {
			return null;
		}

		return this.sound.getStatusAsync();
	}

	// With an owner, only unloads when that owner still holds the Sound (a screen that is
	// closing must not kill audio the next screen started).
	unloadAsync(owner?: string): Promise<void> {
		return this.enqueue(async () => {
			if (owner !== undefined && owner !== this.owner) {
				return;
			}
			await this.unloadNowAsync();
		});
	}

	private async unloadNowAsync() {
		const sound = this.sound;
		this.sound = null;
		this.owner = null;
		this.statusListener = null;
		if (!sound) {
			return;
		}

		sound.setOnPlaybackStatusUpdate(null);
		try {
			await withTimeout(sound.unloadAsync(), this.timeoutMs, 'Audio unload timed out');
		} catch {
			// Already unloaded, or the unload hung: the reference is dropped either way.
		}
	}
}

export const audioService = new AudioService();
