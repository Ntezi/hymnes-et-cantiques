import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_LOCAL_DIR = path.join(repoRoot, 'audio');
const DEFAULT_BUCKET = process.env.AUDIO_S3_BUCKET || 'ntezi-media';
const DEFAULT_PREFIX = process.env.AUDIO_S3_PREFIX || 'hymnes-cantiques/audio';

const parseArgs = (argv) => {
	const options = {
		localDir: DEFAULT_LOCAL_DIR,
		bucket: DEFAULT_BUCKET,
		prefix: DEFAULT_PREFIX,
		help: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--help' || arg === '-h') {
			options.help = true;
			continue;
		}
		if (arg === '--dir') {
			options.localDir = argv[index + 1] || options.localDir;
			index += 1;
			continue;
		}
		if (arg === '--bucket') {
			options.bucket = argv[index + 1] || options.bucket;
			index += 1;
			continue;
		}
		if (arg === '--prefix') {
			options.prefix = argv[index + 1] || options.prefix;
			index += 1;
			continue;
		}
	}

	return options;
};

const printHelp = () => {
	console.log('Usage: node ./scripts/check-audio-s3.mjs [options]');
	console.log('');
	console.log('Options:');
	console.log('  --dir <path>       Local audio directory (default: ./audio)');
	console.log(`  --bucket <name>    S3 bucket (default: ${DEFAULT_BUCKET})`);
	console.log(`  --prefix <prefix>  S3 key prefix (default: ${DEFAULT_PREFIX})`);
	console.log('  -h, --help         Show this help');
	console.log('');
	console.log('Environment overrides:');
	console.log('  AUDIO_S3_BUCKET, AUDIO_S3_PREFIX');
};

const listLocalAudio = (localDir) => {
	const entries = fs.readdirSync(localDir, { withFileTypes: true });
	const files = new Map();

	for (const entry of entries) {
		if (!entry.isFile()) {
			continue;
		}

		if (!entry.name.toLowerCase().endsWith('.mp3')) {
			continue;
		}

		const absolutePath = path.join(localDir, entry.name);
		const relativePath = entry.name;
		const stat = fs.statSync(absolutePath);
		files.set(relativePath, { size: stat.size });
	}

	return files;
};

const runAwsJson = (args) => {
	const stdout = execFileSync('aws', args, {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	return JSON.parse(stdout);
};

const listS3Audio = (bucket, prefix) => {
	const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
	const files = new Map();
	let continuationToken = null;

	while (true) {
		const args = [
			's3api',
			'list-objects-v2',
			'--bucket',
			bucket,
			'--prefix',
			`${normalizedPrefix}/`,
			'--max-keys',
			'1000',
			'--output',
			'json',
		];

		if (continuationToken) {
			args.push('--continuation-token', continuationToken);
		}

		const response = runAwsJson(args);
		const contents = Array.isArray(response.Contents) ? response.Contents : [];

		for (const object of contents) {
			if (!object.Key || !object.Key.toLowerCase().endsWith('.mp3')) {
				continue;
			}

			const relativePath = object.Key.slice(normalizedPrefix.length + 1);
			files.set(relativePath, { size: Number(object.Size || 0), key: object.Key });
		}

		if (!response.IsTruncated || !response.NextContinuationToken) {
			break;
		}
		continuationToken = response.NextContinuationToken;
	}

	return files;
};

const main = () => {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		printHelp();
		process.exit(0);
	}

	if (!fs.existsSync(options.localDir)) {
		console.error(`Local directory not found: ${options.localDir}`);
		process.exit(2);
	}

	const localFiles = listLocalAudio(options.localDir);
	const s3Files = listS3Audio(options.bucket, options.prefix);

	const missingInS3 = [];
	const extraInS3 = [];
	const sizeMismatches = [];

	for (const [name, localMeta] of localFiles.entries()) {
		const remoteMeta = s3Files.get(name);
		if (!remoteMeta) {
			missingInS3.push(name);
			continue;
		}
		if (localMeta.size !== remoteMeta.size) {
			sizeMismatches.push({
				file: name,
				localSize: localMeta.size,
				s3Size: remoteMeta.size,
			});
		}
	}

	for (const name of s3Files.keys()) {
		if (!localFiles.has(name)) {
			extraInS3.push(name);
		}
	}

	console.log(`Checked local dir: ${options.localDir}`);
	console.log(`Checked S3: s3://${options.bucket}/${options.prefix.replace(/^\/+|\/+$/g, '')}/`);
	console.log(`Local mp3 files: ${localFiles.size}`);
	console.log(`S3 mp3 files: ${s3Files.size}`);
	console.log('');

	if (missingInS3.length === 0 && extraInS3.length === 0 && sizeMismatches.length === 0) {
		console.log('Integrity check passed: local and S3 audio sets match by file name and size.');
		process.exit(0);
	}

	if (missingInS3.length > 0) {
		console.log(`Missing in S3 (${missingInS3.length}):`);
		for (const file of missingInS3) {
			console.log(`  - ${file}`);
		}
		console.log('');
	}

	if (sizeMismatches.length > 0) {
		console.log(`Size mismatches (${sizeMismatches.length}):`);
		for (const mismatch of sizeMismatches) {
			console.log(`  - ${mismatch.file}: local=${mismatch.localSize}, s3=${mismatch.s3Size}`);
		}
		console.log('');
	}

	if (extraInS3.length > 0) {
		console.log(`Extra in S3 (${extraInS3.length}):`);
		for (const file of extraInS3) {
			console.log(`  - ${file}`);
		}
		console.log('');
	}

	process.exit(1);
};

main();
