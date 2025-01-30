#!/bin/bash
./node_modules/rollup/dist/bin/rollup --config rollup.browser.config.js
./node_modules/terser/bin/terser webapp_bundle.full.js -o webapp_bundle.js --config-file terser.regular.config.json
./node_modules/terser/bin/terser webapp_bundle.full.js -o webapp_bundle.min.js --config-file terser.minimal.config.json
