import { MDAI_1 } from '../index';
import { stringToBytes } from '../utils';
import BigNumber from 'bignumber.js';
import { WAD } from '../constants';

export default class GlobalSettlementDaiRedeemer {
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
      .getToken(MDAI_1)
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
    return BigNumber(gemBalance).div(WAD);
  }

  async bagAmount(address) {
    const end = this._container.get('smartContract').getContract('MCD_END_1');
    const bag = await end.bag(address);
    return MDAI_1.wei(bag);
  }

  async packDai(daiAmount) {
    const formattedAmount = MDAI_1(daiAmount).toFixed('wei');
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

  async cashEth(daiAmount) {
    const formattedAmount = MDAI_1(daiAmount).toFixed('wei');
    const joinAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_JOIN_ETH_A');
    const endAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_END_1');
    const ilkBytes = stringToBytes('ETH-A');
    return this._container
      .get('smartContract')
      .getContract('PROXY_ACTIONS_END')
      .cashETH(joinAddress, endAddress, ilkBytes, formattedAmount, {
        dsProxy: true
      });
  }

  async cashBat(daiAmount) {
    const formattedAmount = MDAI_1(daiAmount).toFixed('wei');
    const joinAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_JOIN_BAT_A');
    const endAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_END_1');
    const ilkBytes = stringToBytes('BAT-A');
    return this._container
      .get('smartContract')
      .getContract('PROXY_ACTIONS_END')
      .cashGem(joinAddress, endAddress, ilkBytes, formattedAmount, {
        dsProxy: true
      });
  }

  async cashUsdc(daiAmount) {
    const formattedAmount = MDAI_1(daiAmount).toFixed('wei');
    const joinAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_JOIN_USDC_A');
    const endAddress = this._container
      .get('smartContract')
      .getContractAddress('MCD_END_1');
    const ilkBytes = stringToBytes('USDC-A');
    return this._container
      .get('smartContract')
      .getContract('PROXY_ACTIONS_END')
      .cashGem(joinAddress, endAddress, ilkBytes, formattedAmount, {
        dsProxy: true
      });
  }
}
