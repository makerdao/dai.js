import { utils } from 'ethers';
import contracts from '../../contracts/contracts';
import { DAI, WETH } from '../../src/eth/Currency';
import { mineBlocks } from './transactionConfirmation';

async function offer(
  oasisExchangeService,
  payAmount,
  payTokenAddress,
  buyAmount,
  buyTokenAddress,
  pos,
  overrides
) {
  const oasisContract = oasisExchangeService
    .get('smartContract')
    .getContractByName(contracts.MAKER_OTC);
  return oasisContract.offer(
    payAmount,
    payTokenAddress,
    buyAmount,
    buyTokenAddress,
    pos,
    overrides
  );
}

function placeLimitOrder(oasisExchangeService, sellDai) {
  let ethereumTokenService;
  ethereumTokenService = oasisExchangeService.get('token');
  const wethToken = ethereumTokenService.getToken(WETH);
  const daiToken = ethereumTokenService.getToken(DAI);
  return wethToken
    .deposit('1')
    .then(() => {
      const oasisContract = oasisExchangeService
        .get('smartContract')
        .getContractByName(contracts.MAKER_OTC);
      return wethToken.approveUnlimited(oasisContract.address).onMined();
    })
    .then(() => {
      return wethToken.balanceOf(
        oasisExchangeService.get('web3').currentAccount()
      );
    })
    .then(() => {
      return daiToken.balanceOf(
        oasisExchangeService.get('web3').currentAccount()
      );
    })
    .then(() => {
      const wethAddress = wethToken.address();
      const daiAddress = ethereumTokenService.getToken(DAI).address();
      const overrideOptions = { gasLimit: 5500000 };
      if (sellDai) {
        return offer(
          oasisExchangeService,
          utils.parseEther('0.5'),
          daiAddress,
          utils.parseEther('2.0'),
          wethAddress,
          0,
          overrideOptions
        );
      } else {
        return offer(
          oasisExchangeService,
          utils.parseEther('0.5'),
          wethAddress,
          utils.parseEther('10.0'),
          daiAddress,
          1,
          overrideOptions
        );
      }
    })
    .then(() => {
      return wethToken.balanceOf(
        oasisExchangeService.get('web3').currentAccount()
      );
    })
    .then(() => {
      return daiToken.balanceOf(
        oasisExchangeService.get('web3').currentAccount()
      );
    });
}

export default async function createDaiAndPlaceLimitOrder(
  oasisExchangeService,
  sellDai = false
) {
  const cdp = await oasisExchangeService.get('cdp').openCdp();
  const tx = cdp.lockEth(0.1);
  mineBlocks(oasisExchangeService.get('token'));
  await tx;
  await cdp.drawDai(1);
  return placeLimitOrder(oasisExchangeService, sellDai);
}
