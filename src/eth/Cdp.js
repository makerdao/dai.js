import TransactionManager from '../exchanges/TransactionManager';
import StateMachine from '../core/StateMachine';
import TransactionObject from './TransactionObject';
import { orderTypeTransitions } from '../exchanges/orderTransitions';

export default class Cdp extends TransactionManager {
  // no longer needs to extend TransactionManager
  // Update through TransactionObject.super?
  
  constructor(cdpService, cdpId) {
    super();
    this._service = cdpService;
    this._id = cdpId;
  }

  shut() {
    super._pending();
    return this._service.shutCdp(this._id);
  }

  getInfo() {
    return this._service.getCdpInfo(this._id);
  }
}
