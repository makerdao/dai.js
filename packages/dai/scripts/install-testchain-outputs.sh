#!/usr/bin/env bash
set -e

CONTRACTS=$DAI/contracts
PLUGIN_ADDRESSES=$CONTRACTS/addresses/testnet.json

for file in $SCD_ABIS/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

cp $SCD_ADDRESSES $PLUGIN_ADDRESSES

MULTICALL=`jq ".MULTICALL" "$MCD_ADDRESSES"`
cat $PLUGIN_ADDRESSES | jq_inplace ".MULTICALL = $(echo $MULTICALL)" $PLUGIN_ADDRESSES

add_prefix $PLUGIN_ADDRESSES
