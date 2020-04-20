import ProviderSubprovider from 'web3-provider-engine/dist/es5/subproviders/subprovider';
import abiCoder from 'ethers/utils/abi-coder';
import debug from 'debug';
const log = debug('MulticallProvider');

const AGGREGATE_SELECTOR = '0x252dba42'; // Function signature for: aggregate((address,bytes)[])

// TODO: https://www.4byte.directory/signatures/?bytes4_signature=57de26a4
const sigFuncMap = {
  '57de26a4': 'read()',
  '51f91066': 'tag()',
  '59e02dd7': 'peek()'
};
const sigToFunc = sig => {
  return sigFuncMap[`${sig}`] || null;
};

export default class MulticallProvider extends ProviderSubprovider {
  constructor(opts) {
    super(opts);

    this.multicallAddress = opts.multicallAddress;
    if (!this.multicallAddress) throw new Error('No multicall contract address specified');

    this.id = 100000;
    this.latestBlock = null;
    this.batchTimer = null;
    this.batchDelay = 1000;
    this.batchedTxs = [];
    this.batchedCallbacks = [];
  }

  setEngine(engine) {
    log('setEngine called');
    this.engine = engine;

    engine.on('block', block => {
      const blockNumber = parseInt(block.number.toString('hex'), 16);
      log(`Engine emitted new block: ${blockNumber}`);
      this.latestBlock = blockNumber;
    });

    engine.on('data', data => log('Engine emitted data', data));
    engine.on('start', () => log('Engine started'));
    engine.on('stop', () => log('Engine stopped'));
  }

  sendBatchedTxs() {
    log(`Sending ${this.batchedTxs.length} batched calls through multicall`);

    const values = this.batchedTxs.map(({ params }) => [params[0].to, params[0].data]);
    const calldata = abiCoder.defaultCoder.encode(
      [
        {
          components: [{ type: 'address' }, { type: 'bytes' }],
          name: 'data',
          type: 'tuple[]'
        }
      ],
      [values]
    );
    const payload = {
      jsonrpc: '2.0',
      id: this.id++,
      method: 'eth_call',
      params: [
        {
          to: this.multicallAddress,
          data: AGGREGATE_SELECTOR + calldata.substr(2)
        },
        'latest'
      ],
      skipMulticall: true
    };
    const callbacks = [ ...this.batchedCallbacks ];

    // Clear batched txs and callbacks
    this.batchTimer = null;
    this.batchedTxs = [];
    this.batchedCallbacks = [];

    this.emitPayload(payload, (err, result) => {
      const decoded = abiCoder.defaultCoder.decode(['uint256', 'bytes[]'], result.result);
      const blockNumber = decoded.shift();
      log(`Latest block number: ${blockNumber.toNumber()}`);
      callbacks.forEach((cb, i) => cb(null, decoded[0][i]));
    });
  }

  handleRequest(payload, next, end) {
    // console.log('handleRequest', payload.method);
    // if (payload.method === 'eth_blockNumber') log('Got eth_blockNumber request');
    // if (payload.method === 'eth_getBlockByNumber') log('Got eth_getBlockByNumber request');
    if (payload.method === 'eth_call' && !payload.skipMulticall) {
      const sig = payload.params[0].data.substr(2, 10);
      const func = sigToFunc(sig);
      log(`Queueing call to ${sig} ${func ? `- ${func}` : ''} (${this.batchedTxs.length} total in queue)`);

      this.batchedTxs.push(payload);
      this.batchedCallbacks.push(end);
      if (!this.batchTimer) this.batchTimer = setTimeout(() => this.sendBatchedTxs(), this.batchDelay);
      return;
    }
    next();
  }
}
