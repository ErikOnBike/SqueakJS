#!/bin/bash
./node_modules/rollup/dist/bin/rollup --config rollup.browser.config.js
node compact.js webapp_bundle.full.js
if [ "$?" != "0" ]; then
	exit 1
fi
./node_modules/terser/bin/terser webapp_bundle.full.js -o webapp_bundle.js --config-file terser.browser.regular.config.json
./node_modules/terser/bin/terser webapp_bundle.full.js -o webapp_bundle.min.js --config-file terser.browser.minimal.config.json
