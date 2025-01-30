#!/bin/bash
./node_modules/rollup/dist/bin/rollup --config rollup.node.config.js
./node_modules/terser/bin/terser nodeapp_bundle.full.js -o nodeapp_bundle.js --config-file terser.node.regular.config.json
./node_modules/terser/bin/terser nodeapp_bundle.full.js -o nodeapp_bundle.min.js --config-file terser.node.minimal.config.json
