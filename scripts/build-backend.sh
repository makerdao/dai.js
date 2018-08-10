#!/usr/bin/env bash

set -e

if [ "$1" = "dirty" ]; then
  echo "Dirty mode: not removing previous build files."
else
  rm -rf dist
fi

babel -q contracts --out-dir ./dist/contracts
babel -q contracts/addresses --out-dir ./dist/contracts/addresses
babel -q src --out-dir ./dist/src

copyfiles \
  README.md \
  LICENSE \
  package.json \
  contracts/abi/**/* \
  contracts/abi/dai/**/* \
  src/config/presets/* \
  contracts/addresses/daiV1.json \
  contracts/addresses/exchanges.json \
  dist
