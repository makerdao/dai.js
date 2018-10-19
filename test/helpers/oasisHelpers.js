import { utils } from 'ethers';
import contracts from '../../contracts/contracts';
import { DAI, WETH } from '../../src/eth/Currency';
import { mineBlocks } from './transactionConfirmation';

export default async function createDaiAndPlaceLimitOrder(
  oasisExchangeService,
  sellDai = false
) {
  const cdp = await oasisExchangeService.get('cdp').openCdp();
  const tx = cdp.lockEth(0.1);
  mineBlocks(oasisExchangeService);
  await tx;
  await cdp.drawDai(1);
  return placeLimitOrder(oasisExchangeService, sellDai);
}

async function placeLimitOrder(oasisExchangeService, sellDai) {
  let sellToken, buyToken, value, position;
  const tokenService = oasisExchangeService.get('token');
  const wethToken = tokenService.getToken(WETH);
  const wethAddress = wethToken.address();
  const daiAddress = tokenService.getToken(DAI).address();
  const oasisAddress = oasisExchangeService
    .get('smartContract')
    .getContractByName(contracts.MAKER_OTC).address;

  await wethToken.deposit('1');
  await wethToken.approveUnlimited(oasisAddress);

  if (sellDai) {
    sellToken = daiAddress;
    buyToken = wethAddress;
    value = utils.parseEther('2.0');
    position = 0;
  } else {
    sellToken = wethAddress;
    buyToken = daiAddress;
    value = utils.parseEther('10.0');
    position = 1;
  }

  return offer(
    oasisExchangeService,
    utils.parseEther('0.5'),
    sellToken,
    value,
    buyToken,
    position
  );
}

async function offer(
  oasisExchangeService,
  payAmount,
  payTokenAddress,
  buyAmount,
  buyTokenAddress,
  position
) {
  const oasisContract = oasisExchangeService
    .get('smartContract')
    .getContractByName(contracts.MAKER_OTC);

  return oasisContract.offer(
    payAmount,
    payTokenAddress,
    buyAmount,
    buyTokenAddress,
    position
  );
}
