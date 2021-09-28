#!/usr/bin/env bash

set -e

copyfiles contracts/abis/* dist/abis -f
copyfiles contracts/addresses/* dist/addresses -f
copyfiles contracts/presets/* dist/presets -f
copyfiles contracts/abiMap.json dist