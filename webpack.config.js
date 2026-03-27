const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function(env, argv) {
	const config = await createExpoWebpackConfigAsync(env, argv);
	config.module.rules.forEach((rule) => {
		if (rule.oneOf) {
			rule.oneOf.forEach((oneOfRule) => {
				if (oneOfRule.use && oneOfRule.use.loader && oneOfRule.use.loader.includes('babel-loader')) {
					oneOfRule.include = [path.resolve('.')];
				}
			});
		}
	});

	const navigationSourceMapExclude = /node_modules[\\/]@react-navigation[\\/]/;
	config.module.rules = config.module.rules.map((rule) => {
		const uses = rule.use ? (Array.isArray(rule.use) ? rule.use : [rule.use]) : [];
		const hasSourceMapLoader = uses.some((useEntry) => {
			if (typeof useEntry === 'string') {
				return useEntry.includes('source-map-loader');
			}

			return Boolean(useEntry?.loader && useEntry.loader.includes('source-map-loader'));
		});

		if (!hasSourceMapLoader) {
			return rule;
		}

		const existingExclude = rule.exclude
			? (Array.isArray(rule.exclude) ? rule.exclude : [rule.exclude])
			: [];

		return {
			...rule,
			exclude: [...existingExclude, navigationSourceMapExclude],
		};
	});

	config.ignoreWarnings = [
		...(config.ignoreWarnings || []),
		{
			module: /node_modules\/@react-navigation\/(stack|native|elements)\//,
			message: /Failed to parse source map/,
		},
	];

	return config;
};
