#!/usr/bin/env bash
set -e

CWD=`dirname $0`

$CWD/set-polling-interval.sh

exec $CWD/../testchain/scripts/with-deployed-system $@
