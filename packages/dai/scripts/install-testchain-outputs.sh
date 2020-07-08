#!/usr/bin/env bash
set -e

CONTRACTS=$DAI/contracts
TESTNET_ADDRESSES=$CONTRACTS/addresses/testnet.json

for file in $SOURCE/out/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

cp $SCD_ADDRESSES $TESTNET_ADDRESSES

MULTICALL=`jq ".MULTICALL" "$MCD_ADDRESSES"`
cat $TESTNET_ADDRESSES | jq_inplace ".MULTICALL = $(echo $MULTICALL)" $TESTNET_ADDRESSES

add_prefix $TESTNET_ADDRESSES
