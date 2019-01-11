import Maker from '@makerdao/dai';

export default class CollateralService extends Maker.PublicService {

  constructor(name = 'collateral') {
    super(name, ['smartContract']);
  }

  //what should default unit be?
  async totalCollateral(collateralType) {
    const ilks = await this._vatContract().ilks();
    console.log('ilks', ilks);
    /*const ilk = ilks[getIlk(collateralType.symbol)];
    const Art = ilk.Art;
    return new BigNumber(Art.toString()).dividedBy(RAY).toNumber();*/
  }

  _vatContract() {
    return this.get('smartContract').getContractByName('MCD_VAT');
  }

}