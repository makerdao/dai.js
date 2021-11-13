import fetch from 'node-fetch';
// import Maker from '@makerdao/dai';
import Maker from '../../../dai/src';
import govPlugin from '../../src/index';
import configPlugin from '@makerdao/dai-plugin-config';
import { createCurrency } from '@makerdao/currency';
import { paddedArray } from '../../src/utils/helpers';

const infuraProjectId = 'c3f0f26a4c1742e0949d8eedfc47be67';

const MKR = createCurrency('MKR');

// Until we have better event listeners from the server, we'll have to fake it with sleep
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Feature Flag: remove this block when transition to ex_testchain is complete: */
function ganacheAddress() {
  const port = process.env.GOV_TESTNET_PORT || 2000;
  return `http://localhost:${port}`;
}

export async function takeSnapshotOriginal() {
  try {
    const res = await fetch(ganacheAddress(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        params: []
      })
    });

    const json = await res.json();
    return parseInt(json['result'], 16);
  } catch (err) {
    console.error('Request failed with:', err);
  }
}

export async function restoreSnapshotOriginal(snapId) {
  try {
    const res = await fetch(ganacheAddress(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'evm_revert',
        params: [snapId]
      })
    });

    const json = await res.json();
    return json['result'];
  } catch (err) {
    console.error('Request failed with:', err);
  }
}

export const setupMakerOld = async network => {
  const accounts = {
    owner: {
      type: 'privateKey',
      key: '0x474beb999fed1b3af2ea048f963833c686a0fba05f5724cb6417cf3b8ee9697e'
    },
    ali: {
      type: 'privateKey',
      key: '0xbc838ab7af00cda00cb02efbbe4dbb1ce51f5d2613acfe11bd970ce659ad8704'
    },
    sam: {
      type: 'privateKey',
      key: '0xb3ae65f191aac33f3e3f662b8411cabf14f91f2b48cf338151d6021ea1c08541'
    },
    ava: {
      type: 'privateKey',
      key: '0xa052332a502d9a91636931be4ffd6e1468684544a1a7bc4a64c21c6f5daa759a'
    }
  };

  let url;
  if (network === 'ganache') url = 'http://localhost:2000';
  const preset = network === 'ganache' ? 'http' : network;
  const maker = await Maker.create(preset, {
    plugins: [[govPlugin, { network }]],
    url,
    accounts,
    web3: {
      provider: {
        infuraProjectId
      }
    }
  });
  await maker.authenticate();
  return maker;
};
/** End remove block */

const fetchAccounts = async () => {
  const client = global.client;
  const { details: chainData } = await client.api.getChain(global.testchainId);
  const deployedAccounts = chainData.chain_details.accounts;

  // Find the coinbase account and put it aside
  const coinbaseAccount = deployedAccounts.find(
    account => account.address === chainData.chain_details.coinbase
  );
  const otherAccounts = deployedAccounts.filter(
    account => account !== coinbaseAccount
  );

  // Set some account names for easy reference
  const accounts = ['ali', 'sam', 'ava'].reduce((result, name, i) => {
    result[name] = {
      type: 'privateKey',
      key: otherAccounts[i].priv_key
    };
    return result;
  }, {});

  // Add the coinbase account back to the accounts
  accounts.owner = { type: 'privateKey', key: coinbaseAccount.priv_key };

  return accounts;
};

export const takeSnapshot = async (testchainId, client, name) => {
  await client.takeSnapshot(testchainId, name);
  await sleep(7000);
  const snapshots = await client.api.listAllSnapshots('ganache');
  const mySnap = snapshots.data.filter(x => x.description === name);

  return mySnap[0].id;
};

export const restoreSnapshot = async (testchainId, client, snapshotId) => {
  client.restoreSnapshot(testchainId, snapshotId);
  await sleep(15000);
  return true;
};

export const deleteSnapshot = async (client, snapshotId) => {
  await client.api.deleteSnapshot(snapshotId);
  await sleep(10000);
  return true;
};

export const setupTestMakerInstance = async (network = 'ganache') => {
  // Remove this line when the old testchain system is fully replace
  if (global.useOldChain) return setupMakerOld(network);

  const accounts = await fetchAccounts();
  const maker = await Maker.create('http', {
    plugins: [
      [govPlugin, { network }],
      [
        configPlugin,
        { testchainId: global.testchainId, backendEnv: global.backendEnv }
      ]
    ],
    url: global.rpcUrl,
    accounts
  });

  await maker.authenticate();

  return maker;
};

export const linkAccounts = async (maker, initiator, approver) => {
  const lad = maker.currentAccount().name;
  // initiator wants to create a link with approver
  maker.useAccountWithAddress(initiator);
  const vpsFactory = maker.service('voteProxyFactory');
  await vpsFactory.initiateLink(approver);

  // approver confirms it
  maker.useAccountWithAddress(approver);
  await maker.service('voteProxyFactory').approveLink(initiator);

  // no other side effects
  maker.useAccount(lad);
};

export const sendMkrToAddress = async (
  maker,
  accountToUse,
  receiver,
  amount
) => {
  const lad = maker.currentAccount().name;
  const mkr = await maker.getToken(MKR);

  await maker.useAccountWithAddress(accountToUse);
  await mkr.transfer(receiver, amount);

  maker.useAccount(lad);
};

export const setUpAllowance = async (maker, address) => {
  const lad = maker.currentAccount().name;
  const mkr = await maker.getToken(MKR);

  await mkr.approveUnlimited(address);

  maker.useAccount(lad);
};

export const addressRegex = /^0x[a-fA-F0-9]{40}$/;

export const createBallot = preferenceList => {
  const reversedPreferenceList = preferenceList.reverse();
  return paddedArray(
    32 - reversedPreferenceList.length,
    reversedPreferenceList
  );
};
