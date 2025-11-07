replace = require("@rollup/plugin-replace");
resolve = require("@rollup/plugin-node-resolve");
commonjs = require("@rollup/plugin-commonjs");

module.exports = {
	input: "builder.js",
	output: {
		file: "builder_bundle.full.js",
		format: "cjs"
	},
	plugins: [
		replace({
			"vmBuild: \"unknown\"": "vmBuild: \"cp-" + new Date().toISOString().replace(/T.*/, "").replace(/-/g, "") + "\"",
			delimiters: [ "", "" ],
			preventAssignment: true	// Prevent warning message
		}),
		resolve(),
		commonjs({
			ignoreDynamicRequires: true
		})
	],
	onwarn: function(warning, warn) {
		// suppress eval warnings
		if(warning.code === 'EVAL') return;
		warn(warning)
	}
};
