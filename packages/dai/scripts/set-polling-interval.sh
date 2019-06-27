#!/usr/bin/env bash
# speed up ethers.js polling so tests finish faster
# run this from the project root

CWD="${0%/*}"
INTERVAL=${1:-50}

function sed_inplace {
  # sed's -i argument behaves differently on macOS, hence this hack
  sed -i.bak "$1" $2 && rm $2.bak
}

echo Setting ethers.js polling interval to $INTERVAL ms.
sed_inplace "s/var pollingInterval = [0-9]*/var pollingInterval = $INTERVAL/" \
  $CWD/../node_modules/ethers/providers/provider.js
