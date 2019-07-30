#!/bin/bash

if [ $(basename $(pwd)) != "dai" ]; then
  echo "This script must be run from the dai directory."
  exit
fi

yarn config set version-tag-prefix "dai-v"
yarn config set version-git-message "dai-v%s"
yarn version

rm -rf dist/*
babel contracts --out-dir ./dist/contracts
babel contracts/addresses --out-dir ./dist/contracts/addresses
babel src --out-dir ./dist/src

copyfiles \
  contracts/abis/* \
  src/config/presets/* \
  contracts/addresses/* \
  dist
