import { DAI_1 } from '../tokens';
import { stringToBytes } from '../utils';
import BigNumber from 'bignumber.js';
import { WAD } from '../constants';

export default class GlobalSettlementDaiRedeemer {
  _container;

  constructor(container) {
    this._container = container;
    return this;
  }

  async check() {
    const smartContract = this._container.get('smartContract');
    const end = smartContract.getContract('MCD_END_1');
    const isInGlobalSettlement = !(await end.live());
    if (!isInGlobalSettlement) return false;

    const address =
      (await this._container.get('proxy').currentProxy()) ||
      this._container.get('accounts').currentAddress();

    const daiBalance = await this._container
      .get('token')
      .getToken(DAI_1)
      .balance();
    if (daiBalance.lte(0)) return false;

    const cdpManagerAddress = smartContract.getContractAddress('CDP_MANAGER_1');

    //TODO; don't just look at ilks related to the address's Vaults
    const [, , ilks] = await smartContract
      .getContract('GET_CDPS_1')
      .getCdpsDesc(cdpManagerAddress, address);

    const uniqueIlks = [...new Set(ilks)];
    const fixes = await Promise.all(
      uniqueIlks.map(ilk => {
        return end.fix(ilk);
      })
    );

    return fixes.some(fix => fix.gt(0));
  }

  async endGemBalance(ilk) {
    const vat = this._container.get('smartContract').getContract('MCD_VAT_1');
    const endAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_END_1');
    const gemBalance = await vat.gem(stringToBytes(ilk), endAddress);
    return new BigNumber(gemBalance).div(WAD);
  }

  async bagAmount(address) {
    const end = this._container.get('smartContract').getContract('MCD_END_1');
    const bag = await end.bag(address);
    return DAI_1.wei(bag);
  }

  async packDai(daiAmount) {
    const formattedAmount = DAI_1(daiAmount).toFixed('wei');
    const endAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_END_1');
    const daiJoinAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_JOIN_DAI');
    return this._container
      .get('smartContract')
      .getContract('PROXY_ACTIONS_END')
      .pack(daiJoinAddress, endAddress, formattedAmount, { dsProxy: true });
  }

  _ilkToAdapter(ilk) {
    return 'MCD_JOIN_' + ilk.replace(/-/g, '_');
  }

  async cash(daiAmount, ilk) {
    const formattedAmount = DAI_1(daiAmount).toFixed('wei');
    const joinAddress = this._container
      .get('smartContract')
      .getContractAddress(this._ilkToAdapter(ilk));
    const endAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_END_1');
    const ilkBytes = stringToBytes(ilk);
    const methodName = ilk.substring(0, 3) === 'ETH' ? 'cashETH' : 'cashGem';
    /* prettier-ignore */
    return this._container
      .get('smartContract')
      .getContract('PROXY_ACTIONS_END')[methodName](joinAddress, endAddress, ilkBytes, formattedAmount, {
        dsProxy: true
      });
  }
}
