import PublicService from '../core/PublicService';

export default class NonceService extends PublicService {
  constructor(name = 'nonce') {
    super(name, ['web3']);
    this._transaction_count = 0;
  }

  async initialize() {}

  async getNonce() {}

  setNonce() {}
}
