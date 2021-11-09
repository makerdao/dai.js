#!/usr/bin/env bash

set -e
copyfiles contracts/abis/* dist/abis -f
copyfiles contracts/addresses/* dist/addresses -f
