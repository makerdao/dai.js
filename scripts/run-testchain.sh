#!/usr/bin/env bash
set -e

CWD="${0%/*}"

$CWD/set-polling-interval.sh
$CWD/../testchain/scripts/launch $@
