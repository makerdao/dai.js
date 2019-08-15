#!/usr/bin/env bash
set -e

# TODO take the source directory as a parameter

CWD=`dirname $0`
CONTRACTS=$CWD/../contracts
SOURCE=${1:-$CWD/../../../node_modules/@makerdao/testchain}

# Relevant contracts from SCD:
for CONTRACT in "TUB" "REDEEMER" "OLD_MKR"
do
  ADDRESS=`jq ".$CONTRACT" "$SOURCE/out/addresses.json"`
  jq ".$CONTRACT=$ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
done

for CONTRACT in "SaiTub" "Redeemer" "ERC20"
do
  cp $SOURCE/out/$CONTRACT.abi $CONTRACTS/abis/$CONTRACT.json
done

# Relevant contracts from MCD:
for CONTRACT in "MCD_END" "MCD_VAT" "GET_CDPS" "CDP_MANAGER" "MCD_DAI" "MCD_POT"
do
  ADDRESS=`jq ".$CONTRACT" "$SOURCE/out/addresses-mcd.json"`
  SUFFIX="_1"
  jq ".$CONTRACT$SUFFIX=$ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
done

for CONTRACT in "End" "Vat" "GetCdps" "DssCdpManager" "Dai" "Pot"
do
  cp $SOURCE/out/mcd/$CONTRACT.abi $CONTRACTS/abis/$CONTRACT.json
done
