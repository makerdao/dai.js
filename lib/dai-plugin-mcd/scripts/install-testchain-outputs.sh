#!/usr/bin/env bash
set -e

CWD=`dirname $0`
CONTRACTS=$CWD/../contracts
SOURCE=${1:-$CWD/../../../testchain}

for file in $SOURCE/out/mcd/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

cp $SOURCE/out/addresses-mcd.json $CONTRACTS/addresses/testnet.json
