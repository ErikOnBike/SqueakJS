#!/bin/bash
./node_modules/rollup/dist/bin/rollup --config rollup.builder.config.js
node compact.js builder_bundle.full.js
if [ "$?" != "0" ]; then
	exit 1
fi
./node_modules/terser/bin/terser builder_bundle.full.js -o builder_bundle.js --config-file terser.builder.regular.config.json
./node_modules/terser/bin/terser builder_bundle.full.js -o builder_bundle.min.js --config-file terser.builder.minimal.config.json
