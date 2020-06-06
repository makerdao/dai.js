#!/usr/bin/env bash
set -e

# TODO take the source directory as a parameter

CWD=`dirname $0`
CONTRACTS=$CWD/../packages/dai-plugin-migrations/contracts
SOURCE=${1:-$CWD/../node_modules/@makerdao/testchain}

# Relevant contracts from SCD:
for CONTRACT in "TUB","SaiTub" "REDEEMER","Redeemer" "OLD_MKR","DSToken" "OLD_CHIEF","DSChief" "SAI_CAGEFREE","CageFree" "OLD_VOTE_PROXY_FACTORY","VoteProxyFactory"
do
  IFS=',' read NAME ABI <<< "${CONTRACT}"
  ADDRESS=`jq ".$NAME" "$SOURCE/out/addresses.json"`
  jq ".$NAME=$ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
  cp $SOURCE/out/$ABI.abi $CONTRACTS/abis/$ABI.json
done

# Relevant contracts from MCD:
for CONTRACT in "MCD_JOIN_ETH_A","GemJoin" "MCD_JOIN_DAI","DaiJoin" "MCD_JOIN_BAT_A","GemJoin" "MIGRATION","ScdMcdMigration" "MIGRATION_PROXY_ACTIONS","MigrationProxyActions" "PROXY_ACTIONS_END","DssProxyActionsEnd" "MCD_JOIN_USDC_A","GemJoin" "MCD_ESM","ESM"
do
  IFS=',' read NAME ABI <<< "${CONTRACT}"
  ADDRESS=`jq ".$NAME" "$SOURCE/out/addresses-mcd.json"`
  jq ".$NAME=$ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
  cp $SOURCE/out/mcd/$ABI.abi $CONTRACTS/abis/$ABI.json
done

# Contracts (from MCD) with numbered versions:
for CONTRACT in "MCD_END","END" "MCD_VAT","VAT" "GET_CDPS","GetCdps" "CDP_MANAGER","DssCdpManager" "MCD_DAI","Dai" "MCD_POT","Pot"
do
  IFS=',' read NAME ABI <<< "${CONTRACT}"
  ADDRESS=`jq ".$NAME" "$SOURCE/out/addresses-mcd.json"`
  KOVAN_ADDRESS=`jq ".$NAME" "$CONTRACTS/../../dai-plugin-mcd/contracts/addresses/kovan.json"`
  SUFFIX="_1"
  jq ".$NAME$SUFFIX=$ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
  jq ".$NAME$SUFFIX=$KOVAN_ADDRESS" $CONTRACTS/addresses/kovan.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/kovan.json
  cp $SOURCE/out/mcd/$ABI.abi $CONTRACTS/abis/$ABI.json
done

ADDRESS=`jq ".MIGRATION" "$CONTRACTS/../../dai-plugin-mcd/contracts/addresses/testnet.json"`
KOVAN_ADDRESS=`jq ".MIGRATION" "$CONTRACTS/../../dai-plugin-mcd/contracts/addresses/kovan.json"`
jq ".MIGRATION=$ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".MIGRATION=$KOVAN_ADDRESS" $CONTRACTS/addresses/kovan.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/kovan.json
cp $CONTRACTS/../../dai-plugin-mcd/contracts/abis/ScdMcdMigration.json $CONTRACTS/abis/ScdMcdMigration.json

ADDRESS=`jq ".MIGRATION_PROXY_ACTIONS" "$CONTRACTS/../../dai-plugin-mcd/contracts/addresses/testnet.json"`
KOVAN_ADDRESS=`jq ".MIGRATION_PROXY_ACTIONS" "$CONTRACTS/../../dai-plugin-mcd/contracts/addresses/kovan.json"`
jq ".MIGRATION_PROXY_ACTIONS=$ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".MIGRATION_PROXY_ACTIONS=$KOVAN_ADDRESS" $CONTRACTS/addresses/kovan.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/kovan.json
cp $CONTRACTS/../../dai-plugin-mcd/contracts/abis/MigrationProxyActions.json $CONTRACTS/abis/MigrationProxyActions.json

ADDRESS=`jq ".OLD_VOTE_PROXY_FACTORY" "$CONTRACTS/../../dai/contracts/addresses/testnet.json"`
KOVAN_ADDRESS=`jq ".OLD_VOTE_PROXY_FACTORY" "$CONTRACTS/../../dai/contracts/addresses/kovan.json"`
jq ".OLD_VOTE_PROXY_FACTORY=$ADDRESS" $CONTRACTS/addresses/testnet.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/testnet.json
jq ".OLD_VOTE_PROXY_FACTORY=$KOVAN_ADDRESS" $CONTRACTS/addresses/kovan.json > testnet.tmp && mv testnet.tmp $CONTRACTS/addresses/kovan.json
cp $CONTRACTS/../../dai/contracts/abis/VoteProxyFactory.json $CONTRACTS/abis/VoteProxyFactory.json