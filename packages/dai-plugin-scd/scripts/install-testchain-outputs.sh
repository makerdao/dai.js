#!/usr/bin/env bash
set -e

CONTRACTS=$SCD/contracts
TESTNET_ADDRESSES=$CONTRACTS/addresses/testnet.json

for file in $SOURCE/out/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

cp $SCD_ADDRESSES $TESTNET_ADDRESSES

add_prefix $TESTNET_ADDRESSES
