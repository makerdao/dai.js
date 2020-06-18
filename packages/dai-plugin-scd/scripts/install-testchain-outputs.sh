#!/usr/bin/env bash
set -e

CONTRACTS=$SCD/contracts

for file in $SOURCE/out/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

cp $SOURCE/out/addresses.json $CONTRACTS/addresses/testnet.json
MULTICALL=$(cat $SOURCE/out/addresses-mcd.json | jq '.MULTICALL')

cat $CONTRACTS/addresses/testnet.json | jq_inplace ".MULTICALL = $(echo $MULTICALL)" $CONTRACTS/addresses/testnet.json
