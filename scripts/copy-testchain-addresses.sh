#!/usr/bin/env bash
set -e

CWD=`dirname $0`
CONTRACTS=$CWD/../contracts
SOURCE=${1:-$CWD/../testchain}

cp $SOURCE/out/addresses.json $CONTRACTS/addresses/testnet.json
