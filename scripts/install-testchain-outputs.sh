#!/usr/bin/env bash
set -e

CWD=`dirname $0`

. $CWD/../packages/dai-plugin-mcd/scripts/install-testchain-outputs.sh
. $CWD/../packages/dai-plugin-scd/scripts/install-testchain-outputs.sh
. $CWD/../packages/dai/scripts/install-testchain-outputs.sh
. $CWD/../packages/dai-plugin-migrations/scripts/install-testchain-outputs.sh
. $CWD/../packages/dai-plugin-governance/scripts/install-testchain-outputs.sh