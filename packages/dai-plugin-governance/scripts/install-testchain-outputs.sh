#!/usr/bin/env bash
set -e

CONTRACTS=$GOVERNANCE/contracts

CHIEF=`jq ".MCD_ADM" "$SOURCE/out/addresses-mcd.json"`
jq ".CHIEF=$CHIEF" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
cp $SOURCE/out/DSChief.abi $CONTRACTS/abis/DSChief.json

IOU=`jq ".MCD_IOU" "$SOURCE/out/addresses-mcd.json"`
jq ".IOU=$IOU" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json

POLLING=`jq ".POLLING" "$SOURCE/out/addresses.json"`
jq ".POLLING=$POLLING" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
cp $SOURCE/out/PollingEmitter.abi $CONTRACTS/abis/Polling.json

GOV=`jq ".GOV" "$SOURCE/out/addresses.json"`
jq ".SAI_GOV=$GOV" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json

for CONTRACT in "VOTE_PROXY_FACTORY","VoteProxyFactory" "MCD_ESM","ESM" "MCD_END","End"
do
  IFS=',' read NAME ABI <<< "${CONTRACT}"
  ADDRESS=`jq ".$NAME" "$SOURCE/out/addresses-mcd.json"`
  jq ".$NAME=$ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
  cp $SOURCE/out/mcd/$ABI.abi $CONTRACTS/abis/$ABI.json
done