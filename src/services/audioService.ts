import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';

type PlaybackStatusListener = (status: AVPlaybackStatusSuccess) => void;

const PLAYBACK_POLL_INTERVAL_MS = 250;

class AudioService {
	private sound: Audio.Sound | null = null;
	private statusListener: PlaybackStatusListener | null = null;

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

	async loadAsync(source: string | { uri: string } | number, shouldPlay = false): Promise<AVPlaybackStatus> {
		console.log("AudioService.loadAsync: Loading source", source);
		await this.unloadAsync();
		await this.configureAsync();

		this.sound = new Audio.Sound();
		this.sound.setOnPlaybackStatusUpdate(this.emitLoadedStatus);

		const loadSource = typeof source === 'string' ? { uri: source } : source;

		return this.sound.loadAsync(
			loadSource,
			{
				shouldPlay,
				positionMillis: 0,
				progressUpdateIntervalMillis: PLAYBACK_POLL_INTERVAL_MS,
			}
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

	async unloadAsync() {
		if (!this.sound) {
			return;
		}

		this.sound.setOnPlaybackStatusUpdate(null);
		await this.sound.unloadAsync();
		this.sound = null;
	}
}

export const audioService = new AudioService();
