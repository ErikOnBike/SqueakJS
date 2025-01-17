replace = require("@rollup/plugin-replace");
resolve = require("@rollup/plugin-node-resolve");

module.exports = {
	input: "webapp.js",
	output: {
		file: "webapp_bundle.full.js",
		format: "iife"
	},
	plugins: [
		replace({
			"vmBuild: \"unknown\"": "vmBuild: \"cp-" + new Date().toISOString().replace(/T.*/, "").replace(/-/, "") + "\"",
			delimiters: [ "", "" ],
			preventAssignment: true	// Prevent warning message
		}),
		resolve()
	],
	onwarn: function(warning, warn) {
		// suppress eval warnings
		if(warning.code === 'EVAL') return;
		warn(warning)
	}
};
