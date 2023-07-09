#!/bin/bash
DATE=`date "+%Y%m%d"`
node_modules/rollup/dist/bin/rollup app.js --format iife | sed "s/vmBuild: \"unknown\"/vmBuild: \"${DATE}\"/" > squeak_headless_bundle.js 
