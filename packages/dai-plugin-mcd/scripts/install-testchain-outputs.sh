#!/usr/bin/env bash
set -e

CONTRACTS=$MCD/contracts

for file in $SOURCE/out/mcd/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

TESTNET_ADDRESSES=$CONTRACTS/addresses/testnet.json
cp $MCD_ADDRESSES $TESTNET_ADDRESSES

# These contracts are no longer supported, but dummy addresses
# must still be set to prevent errors when fetching event history
DEPRECATED_CONTRACTS=$MCD/test/contracts/deprecatedContracts.json
MIGRATION=`jq ".MIGRATION" "$DEPRECATED_CONTRACTS"`
MCD_JOIN_SAI=`jq ".MCD_JOIN_SAI" "$DEPRECATED_CONTRACTS"`
cat $TESTNET_ADDRESSES | jq_inplace ".MIGRATION = $(echo $MIGRATION)" $TESTNET_ADDRESSES
cat $TESTNET_ADDRESSES | jq_inplace ".MCD_JOIN_SAI = $(echo $MCD_JOIN_SAI)" $TESTNET_ADDRESSES