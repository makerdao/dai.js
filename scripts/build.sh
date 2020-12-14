#!/usr/bin/env bash

if [ $(basename $(dirname $(pwd))) != "packages" ]; then
  echo "This script must be run from a directory under packages/."
fi

PACKAGE=$(basename $(pwd))
echo "Building $PACKAGE..."

rm -rf dist/*
../../node_modules/.bin/babel --no-babelrc -d dist src
