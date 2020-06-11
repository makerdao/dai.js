#!/usr/bin/env bash
set -e

# TODO take the source directory as a parameter

CONTRACTS=$MCD/contracts

for file in $SOURCE/out/mcd/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

PACKAGE_ADDRESSES=$CONTRACTS/addresses/testnet.json
cp $SOURCE/out/addresses-mcd.json $PACKAGE_ADDRESSES

# These contracts are no longer supported, but dummy addresses
# must still be set to prevent errors when fetching event history
DEPRECATED_CONTRACTS=$MCD/test/contracts/deprecatedContracts.json
MIGRATION=$(cat $DEPRECATED_CONTRACTS | jq '.MIGRATION')
MCD_JOIN_SAI=$(cat $DEPRECATED_CONTRACTS | jq '.MCD_JOIN_SAI')
cat $PACKAGE_ADDRESSES | jq_inplace ".MIGRATION = $(echo $MIGRATION)" $PACKAGE_ADDRESSES
cat $PACKAGE_ADDRESSES | jq_inplace ".MCD_JOIN_SAI = $(echo $MCD_JOIN_SAI)" $PACKAGE_ADDRESSES

