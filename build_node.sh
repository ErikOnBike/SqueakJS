#!/bin/bash
./node_modules/rollup/dist/bin/rollup --config rollup.node.config.js
./node_modules/terser/bin/terser squeak_node_bundle.full.js -o squeak_node_bundle.js --config-file terser.regular.config.json
./node_modules/terser/bin/terser squeak_node_bundle.full.js -o squeak_node_bundle.min.js --config-file terser.minimal.config.json
