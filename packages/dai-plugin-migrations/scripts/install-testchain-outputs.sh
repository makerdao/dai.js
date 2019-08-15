#!/usr/bin/env bash
set -e

# TODO take the source directory as a parameter

CWD=`dirname $0`
CONTRACTS=$CWD/../contracts
SOURCE=${1:-$CWD/../../../node_modules/@makerdao/testchain}

TUB_ADDRESS=`jq ".TUB" $SOURCE/out/addresses.json`
REDEEMER_ADDRESS=`jq ".REDEEMER" $SOURCE/out/addresses.json`
OLD_MKR_ADDRESS=`jq ".OLD_MKR" $SOURCE/out/addresses.json`
MCD_END_ADDRESS=`jq ".MCD_END" $SOURCE/out/addresses-mcd.json`
MCD_VAT_ADDRESS=`jq ".MCD_VAT" $SOURCE/out/addresses-mcd.json`
GET_CDPS_ADDRESS=`jq ".GET_CDPS" $SOURCE/out/addresses-mcd.json`
CDP_MANAGER_ADDRESS=`jq ".CDP_MANAGER" $SOURCE/out/addresses-mcd.json`
MCD_DAI_ADDRESS=`jq ".MCD_DAI" $SOURCE/out/addresses-mcd.json`
MCD_POT_ADDRESS=`jq ".MCD_POT" $SOURCE/out/addresses-mcd.json`

jq ".TUB=$TUB_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".REDEEMER=$REDEEMER_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".OLD_MKR=$OLD_MKR_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".MCD_END_1=$MCD_END_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".MCD_VAT_1=$MCD_VAT_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".GET_CDPS_1=$GET_CDPS_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".CDP_MANAGER_1=$CDP_MANAGER_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".MCD_DAI_1=$MCD_DAI_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".MCD_POT_1=$MCD_POT_ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json

cp $SOURCE/out/SaiTub.abi $CONTRACTS/abis/SaiTub.json
cp $SOURCE/out/Redeemer.abi $CONTRACTS/abis/Redeemer.json
cp $SOURCE/out/ERC20.abi $CONTRACTS/abis/ERC20.json
cp $SOURCE/out/mcd/End.abi $CONTRACTS/abis/End.json
cp $SOURCE/out/mcd/Vat.abi $CONTRACTS/abis/Vat.json
cp $SOURCE/out/mcd/GetCdps.abi $CONTRACTS/abis/GetCdps.json
cp $SOURCE/out/mcd/DssCdpManager.abi $CONTRACTS/abis/DssCdpManager.json
cp $SOURCE/out/mcd/Dai.abi $CONTRACTS/abis/Dai.json
cp $SOURCE/out/mcd/Pot.abi $CONTRACTS/abis/Pot.json
