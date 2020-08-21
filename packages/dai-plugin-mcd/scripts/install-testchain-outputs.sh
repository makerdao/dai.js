#!/usr/bin/env bash
set -e

CONTRACTS=$MCD/contracts

for file in $MCD_ABIS/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

PLUGIN_ADDRESSES=$CONTRACTS/addresses/testnet.json
cp $MCD_ADDRESSES $PLUGIN_ADDRESSES

# These contracts are no longer supported, but dummy addresses
# must still be set to prevent errors when fetching event history

DEPRECATED_CONTRACTS=$MCD/test/contracts/deprecatedContracts.json
for CONTRACT in "MIGRATION" "MCD_JOIN_SAI" "SAI"
do
  ADDRESS=`jq ".$CONTRACT" "$DEPRECATED_CONTRACTS"`
  cat $PLUGIN_ADDRESSES | jq_inplace ".$CONTRACT = $(echo $ADDRESS)" $PLUGIN_ADDRESSES
done
