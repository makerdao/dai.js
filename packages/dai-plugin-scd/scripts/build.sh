#!/usr/bin/env bash

set -e

if [ "$1" = "dirty" ]; then
  echo "Dirty mode: not removing previous build files."
else
  rm -rf dist
fi

babel contracts --out-dir ./dist/contracts
babel contracts/addresses --out-dir ./dist/contracts/addresses
babel src --out-dir ./dist/src

copyfiles \
  contracts/abis/* \
  contracts/abiMap.json \
  src/config/presets/* \
  contracts/addresses/* \
  contracts/abiMap.json \
  dist
