#!/usr/bin/env bash
set -e

CONTRACTS=$GOVERNANCE/contracts
PLUGIN_ADDRESSES=$CONTRACTS/addresses/testnet.json

# Relevant contracts from SCD:
for CONTRACT in "POLLING","PollingEmitter" "BATCH_POLLING","PollingEmitter" "GOV","DSToken"
do
  set_address_and_abi $CONTRACT $SCD_ADDRESSES $SCD_ABIS $PLUGIN_ADDRESSES
done

# Relevant contracts from MCD:
for CONTRACT in "VOTE_PROXY_FACTORY","VoteProxyFactory" "MCD_ESM","ESM" "MCD_END","End" "MCD_ADM","DSChief" "MCD_IOU","DSToken"
do
  set_address_and_abi $CONTRACT $MCD_ADDRESSES $MCD_ABIS $PLUGIN_ADDRESSES
done

# Add 'SAI_' prefix to relevant contracts
add_prefix $PLUGIN_ADDRESSES