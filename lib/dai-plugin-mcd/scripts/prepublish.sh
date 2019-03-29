#!/bin/bash

if [ $(basename $(pwd)) != "dai-plugin-mcd" ]; then
  echo "This script must be run from the dai-plugin-mcd directory."
  exit
fi
CWD=`dirname $0`
rm -rf dist/*
cd ../..
./node_modules/.bin/babel -d lib/dai-plugin-mcd/dist lib/dai-plugin-mcd/src
cd - >/dev/null
