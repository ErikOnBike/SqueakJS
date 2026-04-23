#!/bin/bash
./node_modules/rollup/dist/bin/rollup --config rollup.worker.config.js
node compact.js worker_bundle.full.js
if [ "$?" != "0" ]; then
	exit 1
fi
./node_modules/terser/bin/terser worker_bundle.full.js -o worker_bundle.js --config-file terser.worker.regular.config.json
./node_modules/terser/bin/terser worker_bundle.full.js -o worker_bundle.min.js --config-file terser.worker.minimal.config.json
