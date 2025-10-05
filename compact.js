"use strict";

const KEEP_KEYS = [ "Epoch", "EpochUTC" ];

const fs = require("fs");
const process = require("process");
const filename = process.argv[2];
if(!filename) {
	console.error("Please specify the name of the full bundle as first and only argument");
	process.exit(1);
}
if(!filename.endsWith("_bundle.full.js")) {
	console.error("Compact should only be run on a full bundle (i.e. filename should end with: _bundle.full.js)");
	process.exit(1);
}
if(!fs.existsSync(filename)) {
	console.error("Can't find file: " + filename);
	process.exit(1);
}

require("./cp_globals.js");
require("./vm.js");

let input = fs.readFileSync(filename, "utf8");

function main() {
	Object.keys(Squeak).forEach(function(key) {
		const value = Squeak[key];
		if(Number.isInteger(value) && !KEEP_KEYS.includes(key)) {
			processConstant(key, value);
		}
	});

	// Overwrite original
	fs.writeFileSync(filename, input);

	console.log("Done compacting");
}

function processConstant(key, value) {
	// Replace references to constant with constant value
	input = input.replace(new RegExp(`\\bSqueak\\.${key}\\b`, "g"), `${value}`);

	// Remove the constant definition
	if(value < 0 || value >= 256) {
		value = value >= 0 ? "0x" + value.toString(16) : "-0x" + (-value).toString(16);
	}
	input = input.replace(new RegExp(`${key}\\s*:\\s*${value}\\s*,`, "i"), "");
}

main();
