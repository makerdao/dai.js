#!/usr/bin/env bash
set -e

# TODO take the source directory as a parameter

CWD=`dirname $0`
CONTRACTS=$CWD/../contracts
SOURCE=${1:-$CWD/../../../node_modules/@makerdao/testchain}

TUB_ADDRESS=`jq ".TUB" $SOURCE/out/addresses.json`
REDEEMER_ADDRESS=`jq ".REDEEMER" $SOURCE/out/addresses.json`

jq ".TUB=$TUB_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".REDEEMER=$REDEEMER_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json

cp $SOURCE/out/SaiTub.abi $CONTRACTS/abis/SaiTub.json
cp $SOURCE/out/Redeemer.abi $CONTRACTS/abis/Redeemer.json
