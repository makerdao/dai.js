#!/bin/bash

if [ $(basename $(pwd)) != "dai" ]; then
  echo "This script must be run from the dai directory."
  exit
fi

yarn config set version-tag-prefix 'dai-v'
yarn version

CWD=`dirname $0`
rm -rf dist/*
./build-backend.sh
cd - >/dev/null
