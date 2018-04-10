import contracts from '../../contracts/contracts';

export default function getNewCdpId(service) {
  const contract = service.get('smartContract'),
    tubContract = contract.getContractByName(contracts.TUB),
    ethersSigner = contract.get('web3').ethersSigner(),
    ethersUtils = contract.get('web3').ethersUtils();

  return new Promise(resolve => {
    tubContract.onlognewcup = function(address, cdpIdBytes32) {
      if (ethersSigner.address.toLowerCase() == address.toLowerCase()) {
        const cdpId = ethersUtils.bigNumberify(cdpIdBytes32).toNumber();
        resolve(cdpId);
        this.removeListener();
      }
    };
  });
}
