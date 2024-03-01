#!/bin/bash
./node_modules/rollup/dist/bin/rollup --config rollup.browser.config.js
./node_modules/terser/bin/terser squeak_headless_bundle.full.js -o squeak_headless_bundle.js --config-file terser.regular.config.json
./node_modules/terser/bin/terser squeak_headless_bundle.full.js -o squeak_headless_bundle.min.js --config-file terser.minimal.config.json
