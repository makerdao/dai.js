#!/usr/bin/env bash
set -e

CWD=`dirname $0`
SOURCE=${1:-$CWD/../node_modules/@makerdao/testchain}

function jq_inplace {
  TMP=$(mktemp)
  jq "$1" > $TMP && mv $TMP "$2"
}

DAI=$CWD/../packages/dai
MCD=$CWD/../packages/dai-plugin-mcd
SCD=$CWD/../packages/dai-plugin-scd
MIGRATIONS=$CWD/../packages/dai-plugin-migrations
GOVERNANCE=$CWD/../packages/dai-plugin-governance

. $MCD/scripts/install-testchain-outputs.sh
. $SCD/scripts/install-testchain-outputs.sh
. $DAI/scripts/install-testchain-outputs.sh
. $MIGRATIONS/scripts/install-testchain-outputs.sh
. $GOVERNANCE/scripts/install-testchain-outputs.sh