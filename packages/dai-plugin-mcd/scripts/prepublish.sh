#!/bin/bash

if [ $(basename $(pwd)) != "dai-plugin-mcd" ]; then
  echo "This script must be run from the dai-plugin-mcd directory."
  exit
fi
CWD=`dirname $0`
rm -rf dist/*
cd ../..
./node_modules/.bin/babel --no-babelrc -d packages/dai-plugin-mcd/dist packages/dai-plugin-mcd/src
cd - >/dev/null
