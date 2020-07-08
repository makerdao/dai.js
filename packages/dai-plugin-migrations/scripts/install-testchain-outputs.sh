#!/usr/bin/env bash
set -e

CONTRACTS=$MIGRATIONS/contracts
TESTNET_ADDRESSES=$CONTRACTS/addresses/testnet.json

# Relevant contracts from SCD:
for CONTRACT in "TUB","SaiTub" "TAP","SaiTap" "REDEEMER","Redeemer" "OLD_MKR","DSToken" "OLD_CHIEF","DSChief" "SAI_CAGEFREE","CageFree" "OLD_VOTE_PROXY_FACTORY","VoteProxyFactory"
do
  set_address_and_abi $CONTRACT $SCD_ADDRESSES $SOURCE/out $TESTNET_ADDRESSES
done

# Relevant contracts from MCD:
for CONTRACT in "MCD_JOIN_ETH_A","GemJoin" "MCD_JOIN_DAI","DaiJoin" "MCD_JOIN_BAT_A","GemJoin" "MIGRATION","ScdMcdMigration" "MIGRATION_PROXY_ACTIONS","MigrationProxyActions" "PROXY_ACTIONS_END","DssProxyActionsEnd" "MCD_JOIN_USDC_A","GemJoin" "MCD_ESM","ESM"
do
  set_address_and_abi $CONTRACT $MCD_ADDRESSES $SOURCE/out/mcd $TESTNET_ADDRESSES
done

# Contracts (from MCD) with numbered versions:
for CONTRACT in "MCD_END","END" "MCD_VAT","VAT" "GET_CDPS","GetCdps" "CDP_MANAGER","DssCdpManager" "MCD_DAI","Dai" "MCD_POT","Pot"
do
  VERSION="_1"
  set_address_and_abi $CONTRACT $MCD_ADDRESSES $SOURCE/out/mcd $TESTNET_ADDRESSES $VERSION
done

# Add 'SAI_' prefix to relevant contracts
add_prefix $TESTNET_ADDRESSES