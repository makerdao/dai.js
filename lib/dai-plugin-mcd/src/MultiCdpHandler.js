import Maker from '@makerdao/dai';
const { Currency, ETH } = Maker;

export default class MultiCdpHandler {
  constructor(address, multiCdpService) {
    this.address = address;
    this._multiCdpService = multiCdpService;
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

    const locking = lockAmount && lockAmount.gt(0);
    const drawing = drawAmount && drawAmount.gt(0);

    let joinAddress;
    if (locking) {
      joinAddress = this._multiCdpService.getJoinContractAddress(lockAmount);
    }
    const pitAddress = this._multiCdpService.getContractAddress('MCD_PIT');

    if (!locking) {
      // just draw
      // TODO
    } else if (ETH.isInstance(lockAmount)) {
      if (!drawing) {
        // lock ETH
        return this._multiCdpService.cdpLib.lockETH(
          joinAddress,
          pitAddress,
          {
            dsProxy: this.address,
            value: lockAmount.toEthersBigNumber('wei')
          }
        );
      } else {
        // lock ETH and draw
        // TODO
      }
    } else {
      if (!drawing) {
        // lock gem
        return this._multiCdpService.cdpLib.lockGem(
          joinAddress,
          pitAddress,
          this._multiCdpService.ilk(lockAmount),
          lockAmount.toEthersBigNumber('wei'),
          {
            dsProxy: this.address
          }
        );
      } else {
        // lock gem and draw
        // TODO
      }
    }
  }

  async getLockedAmount(collateralType) {
    const urn = await this._multiCdpService.vat.urns(
      this._multiCdpService.ilk(collateralType),

      // left-pad address to fit bytes32 -- this will change if/when we switch
      // to dss-cdp-manager
      '0x000000000000000000000000' + this.address.replace(/^0x/, '')
    );
    return collateralType.wei(urn.ink);
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
    await null; // allow referencing `promise` from inside itself
    const txo = await multiCdpService.registry.build({ promise });

    // not totally sure why this works... probably because DSProxy is DSNote,
    // and its constructor calls setCache, which has the note modifier?
    // TODO check the log topics to identify it more precisely
    const address = txo.receipt.logs[0].address;
    const handler = new MultiCdpHandler(address, multiCdpService);
    if (lock) await handler.lockAndDraw(lock, draw);
    return handler;
  })();

  return promise;
};
