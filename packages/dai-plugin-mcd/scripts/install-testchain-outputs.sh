#!/usr/bin/env bash
set -e

# TODO take the source directory as a parameter

CWD=`dirname $0`
CONTRACTS=$CWD/../packages/dai-plugin-mcd/contracts
SOURCE=${1:-$CWD/../node_modules/@makerdao/testchain}

function jq_inplace {
  TMP=$(mktemp)
  jq "$1" > $TMP && mv $TMP "$2"
}

for file in $SOURCE/out/mcd/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

PACKAGE_ADDRESSES=$CONTRACTS/addresses/testnet.json
cp $SOURCE/out/addresses-mcd.json $PACKAGE_ADDRESSES

# These contracts are no longer supported, but dummy addresses
# must still be set to prevent errors when fetching event history
DEPRECATED_CONTRACTS=$CWD/../packages/dai-plugin-mcd/test/deprecatedContracts.json
MIGRATION=$(cat $DEPRECATED_CONTRACTS | jq '.MIGRATION')
MCD_JOIN_SAI=$(cat $DEPRECATED_CONTRACTS | jq '.MCD_JOIN_SAI')
cat $PACKAGE_ADDRESSES | jq_inplace ".MIGRATION = $(echo $MIGRATION)" $PACKAGE_ADDRESSES
cat $PACKAGE_ADDRESSES | jq_inplace ".MCD_JOIN_SAI = $(echo $MCD_JOIN_SAI)" $PACKAGE_ADDRESSES

