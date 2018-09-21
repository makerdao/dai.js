#!/usr/bin/env bash
set -e

CWD=`dirname $0`
CONTRACTS=$CWD/../contracts
SOURCE=${1:-$CWD/../testchain}

for file in $SOURCE/out/*.abi; do
  cp $file $CONTRACTS/abi/$(basename $file .abi).json
done
