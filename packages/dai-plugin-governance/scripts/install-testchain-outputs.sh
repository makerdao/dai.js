#!/usr/bin/env bash
set -e

CONTRACTS=$GOVERNANCE/contracts
TESTNET_ADDRESSES=$CONTRACTS/addresses/testnet.json

# Relevant contracts from SCD:
for CONTRACT in "POLLING","PollingEmitter" "GOV","DSToken"
do
  set_address_and_abi $CONTRACT $SCD_ADDRESSES $SOURCE/out $TESTNET_ADDRESSES
done

# Relevant contracts from MCD:
for CONTRACT in "VOTE_PROXY_FACTORY","VoteProxyFactory" "MCD_ESM","ESM" "MCD_END","End" "MCD_ADM","DSChief" "MCD_IOU","DSToken"
do
  set_address_and_abi $CONTRACT $MCD_ADDRESSES $SOURCE/out/mcd $TESTNET_ADDRESSES
done

# Add 'SAI_' prefix to relevant contracts
add_prefix $TESTNET_ADDRESSES