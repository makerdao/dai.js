#!/usr/bin/env bash
set -e

# TODO take the source directory as a parameter

CWD=`dirname $0`
CONTRACTS=$CWD/../contracts
SOURCE=${1:-$CWD/../../../node_modules/@makerdao/testchain}

for file in $SOURCE/out/mcd/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

cp $SOURCE/out/addresses-mcd.json $CONTRACTS/addresses/testnet.json
