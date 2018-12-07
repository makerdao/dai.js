import Maker from '@makerdao/dai';
const { Currency, ETH } = Maker;

export default class MultiCdpHandler {
  constructor(address, multiCdpService) {
    this.address = address;
    this._multiCdpService = multiCdpService;
    this._smartContractService = multiCdpService.get('smartContract');
  }

  lock(amount) {
    return this.lockAndDraw(amount);
  }

  draw(amount) {
    return this.lockAndDraw(null, amount);
  }

  lockAndDraw(lockAmount, drawAmount) {
    if (lockAmount && !(lockAmount instanceof Currency)) {
      throw new Error('lockAmount must be a Currency');
    }
    if (drawAmount && !(drawAmount instanceof Currency)) {
      throw new Error('drawAmount must be a Currency');
    }

    if (!lockAmount || lockAmount.eq(0)) {
      // just draw
      // TODO
    } else if (ETH.isInstance(lockAmount)) {
      if (!drawAmount || drawAmount.eq(0)) {
        // lock ETH
        return this._multiCdpService.cdpLib.lockETH(
          this._smartContractService.getContractAddress('MCD_JOIN_ETH'),
          this._smartContractService.getContractAddress('MCD_PIT'),
          {
            dsProxy: this.address
          }
        );
      } else {
        // lock ETH and draw
        // TODO
      }
    } else {
      if (!drawAmount || drawAmount.eq(0)) {
        // lock gem
        // TODO
      } else {
        // lock gem and draw
        // TODO
      }
    }
  }
}

MultiCdpHandler.create = function(
  multiCdpService,
  { lock, draw, dsProxy } = {} // eslint-disable-line no-unused-vars
) {
  /*
  with dss-proxy (TODO):
  get the user's DSProxy contract, call it with DssProxy's address as target and
  the calldata for the appropriate method, e.g. openLockGemAndDraw.

  without dss-proxy:
  get the CdpRegistry, call build, wait for it to finish and return the new
  handler's address, then call the new handler with CdpLib's address as target
  and the calldata for the appropriate method, e.g. lockGemAndDraw.
  */

  const promise = (async () => {
    await 0;

    const txo = await multiCdpService.registry.build({ promise });

    // not totally sure why this works... probably because DSProxy is DSNote,
    // and its constructor calls setCache, which has the note modifier?
    const address = txo.receipt.logs[0].address;
    const handler = new MultiCdpHandler(address, multiCdpService);
    if (lock) await handler.lockAndDraw(lock, draw);
    return handler;
  })();

  return promise;
};
