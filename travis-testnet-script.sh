#!/usr/bin/env bash
## This script is invoked like
##
##   $ with-deployed-system node index.js
##
## which will run Node in the environment of a running Geth testnet
## with the Sai system deployed.
##
## The environment has ETH_RPC_URL set along with the contract addresses.
##
## When the script exits, the Geth testnet is stopped and deleted.

set -ev

# Start a local testnet on port 2000; set to stop on exit.
./node_modules/.bin/ganache-cli -p 2000 -a 10 & netpid=$!
trap "kill $netpid" EXIT

# Wait until it's up, then use it for the deployment.
export ETH_RPC_URL=http://127.1:2000
until curl -s "$ETH_RPC_URL"; do sleep 2; done