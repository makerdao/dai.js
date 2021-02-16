#!/usr/bin/env bash
set -e

CONTRACTS=$MCD/contracts

for file in $MCD_ABIS/*.abi; do
  cp $file $CONTRACTS/abis/$(basename $file .abi).json
done

PLUGIN_ADDRESSES=$CONTRACTS/addresses/testnet.json
cp $MCD_ADDRESSES $PLUGIN_ADDRESSES

# These contracts are not supported on the testchain, but dummy addresses
# must still be set to prevent errors when fetching event history
DEPRECATED_CONTRACTS=$MCD/test/contracts/deprecatedContracts.json
DEPRECATED_ADDRESSES=`jq "." "$DEPRECATED_CONTRACTS"`
cat $PLUGIN_ADDRESSES | jq_inplace ". += $DEPRECATED_ADDRESSES" $PLUGIN_ADDRESSES

# These contracts are not necessary to deploy on the testchain, e.g. UNI contracts
MOCK_CONTRACTS=$MCD/test/contracts/mockContracts.json
MOCK_ADDRESSES=`jq "." "$MOCK_CONTRACTS"`
cat $PLUGIN_ADDRESSES | jq_inplace ". += $MOCK_ADDRESSES" $PLUGIN_ADDRESSES
