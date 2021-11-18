import { LocalService } from '@makerdao/services-core';
// maybe a "dai.js developer utils" package is useful?
import { MKR, CHIEF } from './utils/constants';
import { getCurrency, netIdToName } from './utils/helpers';

// imports from 'reads'
import { memoizeWith, uniq, nth, takeLast, identity } from 'ramda';
import contractInfo from '../contracts/contract-info.json';
const chiefInfo = contractInfo.chief;

export default class ChiefService extends LocalService {
  constructor(name = 'chief') {
    super(name, ['smartContract', 'web3']);
  }

  // Writes -----------------------------------------------

  etch(addresses) {
    return this._chiefContract().etch(addresses);
  }

  lift(address) {
    return this._chiefContract().lift(address);
  }

  vote(picks) {
    if (Array.isArray(picks))
      return this._chiefContract()['vote(address[])'](picks);
    return this._chiefContract()['vote(bytes32)'](picks);
  }

  lock(amt, unit = MKR) {
    const mkrAmt = getCurrency(amt, unit).toFixed('wei');
    return this._chiefContract().lock(mkrAmt);
  }

  free(amt, unit = MKR) {
    const mkrAmt = getCurrency(amt, unit).toFixed('wei');
    return this._chiefContract().free(mkrAmt);
  }

  // Reads ------------------------------------------------

  paddedBytes32ToAddress = hex =>
    hex.length > 42 ? '0x' + takeLast(40, hex) : hex;

  parseVoteAddressData = data => {
    const candidates = [];
    const addressData = data.substr(330);
    for (let i = 0; i < addressData.length / 64; i++) {
      const address = `0x${addressData.substring(i * 64 + 24, (i + 1) * 64)}`;
      if (address.length === 42) candidates.push(address);
    }
    return candidates;
  };

  // helper for when we might call getSlateAddresses with the same slate several times
  memoizedGetSlateAddresses = memoizeWith(identity, this.getSlateAddresses);

  getDetailedLockLogs = async () => {
    const chiefAddress = this._chiefContract().address;
    const web3Service = this.get('web3');
    const netId = web3Service.network;
    const networkName = netIdToName(netId);
    const locks = await web3Service.getPastLogs({
      fromBlock: chiefInfo.inception_block[networkName],
      toBlock: 'latest',
      address: chiefAddress,
      topics: [chiefInfo.events.lock]
    });

    return locks.map(lockLog => ({
      blockNumber: lockLog.blockNumber,
      sender: this.paddedBytes32ToAddress(lockLog.topics[1]),
      amount: MKR.wei(lockLog.topics[2])
    }));
  };

  getDetailedFreeLogs = async () => {
    const chiefAddress = this._chiefContract().address;
    const web3Service = this.get('web3');
    const netId = web3Service.network;
    const networkName = netIdToName(netId);
    const frees = await web3Service.getPastLogs({
      fromBlock: chiefInfo.inception_block[networkName],
      toBlock: 'latest',
      address: chiefAddress,
      topics: [chiefInfo.events.free]
    });

    return frees.map(freeLog => ({
      blockNumber: freeLog.blockNumber,
      sender: this.paddedBytes32ToAddress(freeLog.topics[1]),
      amount: MKR.wei(freeLog.topics[2])
    }));
  };

  getLockLogs = async () => {
    const chiefAddress = this._chiefContract().address;
    const web3Service = this.get('web3');
    const netId = web3Service.network;
    const networkName = netIdToName(netId);
    const locks = await web3Service.getPastLogs({
      fromBlock: chiefInfo.inception_block[networkName],
      toBlock: 'latest',
      address: chiefAddress,
      topics: [chiefInfo.events.lock]
    });

    return uniq(
      locks
        .map(logObj => nth(1, logObj.topics))
        .map(this.paddedBytes32ToAddress)
    );
  };

  getVoteAddressLogs = async () => {
    const chiefAddress = this._chiefContract().address;
    const web3Service = this.get('web3');
    const netId = web3Service.network;
    const networkName = netIdToName(netId);
    const votes = await web3Service.getPastLogs({
      fromBlock: chiefInfo.inception_block[networkName],
      toBlock: 'latest',
      address: chiefAddress,
      topics: [chiefInfo.events.vote_addresses]
    });

    return votes.map(voteLog => ({
      blockNumber: voteLog.blockNumber,
      sender: this.paddedBytes32ToAddress(voteLog.topics[1]),
      candidates: this.parseVoteAddressData(voteLog.data)
    }));
  };

  getVoteSlateLogs = async () => {
    const chiefAddress = this._chiefContract().address;
    const web3Service = this.get('web3');
    const netId = web3Service.network;
    const networkName = netIdToName(netId);
    const votes = await web3Service.getPastLogs({
      fromBlock: chiefInfo.inception_block[networkName],
      toBlock: 'latest',
      address: chiefAddress,
      topics: [chiefInfo.events.vote_slate]
    });

    return votes.map(voteLog => ({
      blockNumber: voteLog.blockNumber,
      sender: this.paddedBytes32ToAddress(voteLog.topics[1]),
      slate: voteLog.topics[2]
    }));
  };

  async getVoteTally() {
    const voters = await this.getLockLogs();

    const withDeposits = await Promise.all(
      voters.map(voter =>
        this.getNumDeposits(voter).then(deposits => ({
          address: voter,
          deposits: parseFloat(deposits)
        }))
      )
    );

    const withSlates = await Promise.all(
      withDeposits.map(addressDeposit =>
        this.getVotedSlate(addressDeposit.address).then(slate => ({
          ...addressDeposit,
          slate
        }))
      )
    );

    const withVotes = await Promise.all(
      withSlates.map(withSlate =>
        this.memoizedGetSlateAddresses(withSlate.slate).then(addresses => ({
          ...withSlate,
          votes: addresses
        }))
      )
    );

    const voteTally = {};
    for (const voteObj of withVotes) {
      for (let vote of voteObj.votes) {
        vote = vote.toLowerCase();
        if (voteTally[vote] === undefined) {
          voteTally[vote] = {
            approvals: voteObj.deposits,
            addresses: [
              { address: voteObj.address, deposits: voteObj.deposits }
            ]
          };
        } else {
          voteTally[vote].approvals += voteObj.deposits;
          voteTally[vote].addresses.push({
            address: voteObj.address,
            deposits: voteObj.deposits
          });
        }
      }
    }
    for (const [key, value] of Object.entries(voteTally)) {
      const sortedAddresses = value.addresses.sort(
        (a, b) => b.deposits - a.deposits
      );
      const approvals = voteTally[key].approvals;
      const withPercentages = sortedAddresses.map(shapedVoteObj => ({
        ...shapedVoteObj,
        percent: ((shapedVoteObj.deposits * 100) / approvals).toFixed(2)
      }));
      voteTally[key] = withPercentages;
    }
    return voteTally;
  }

  getVotedSlate(address) {
    return this._chiefContract().votes(address);
  }

  getNumDeposits(address) {
    return this._chiefContract()
      .deposits(address)
      .then(n => MKR.wei(n));
  }

  getApprovalCount(address) {
    return this._chiefContract()
      .approvals(address)
      .then(n => MKR.wei(n));
  }

  getHat() {
    return this._chiefContract().hat();
  }

  async getSlateAddresses(slateHash, i = 0) {
    try {
      return [await this._chiefContract().slates(slateHash, i)].concat(
        await this.getSlateAddresses(slateHash, i + 1)
      );
    } catch (_) {
      return [];
    }
  }

  getLockAddressLogs() {
    return new Promise((resolve, reject) => {
      this._chiefContract({ web3js: true })
        .LogNote({ sig: '0xdd467064' }, { fromBlock: 0, toBlock: 'latest' })
        .get((error, result) => {
          if (error) reject(error);
          resolve(result.map(log => log.args.guy));
        });
    });
  }

  getEtchSlateLogs() {
    return new Promise((resolve, reject) => {
      this._chiefContract({ web3js: true })
        .Etch({}, { fromBlock: 0, toBlock: 'latest' })
        .get((error, result) => {
          if (error) reject(error);
          resolve(result.map(log => log.args.slate));
        });
    });
  }

  async getAllSlates() {
    const chiefAddress = this._chiefContract().address;
    const web3Service = this.get('web3');
    const netId = web3Service.network;
    const networkName = netIdToName(netId);
    const etches = await web3Service.getPastLogs({
      fromBlock: chiefInfo.inception_block[networkName],
      toBlock: 'latest',
      address: chiefAddress,
      topics: [chiefInfo.events.etch]
    });
    return etches.map(e => e.topics[1]);
  }

  // Internal --------------------------------------------

  _chiefContract({ web3js = false } = {}) {
    if (web3js) return this.get('smartContract').getWeb3ContractByName(CHIEF);
    return this.get('smartContract').getContractByName(CHIEF);
  }
}
