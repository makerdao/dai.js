import Web3Service from './Web3Service';

test('should fetch version info on connect', () => {
  const web3 = new Web3Service();

  web3.manager().connect().then(() => {
    expect(web3.version().api).toMatch(/^([0-9]+\.)*[0-9]+$/);
    expect(web3.version().node).toMatch(/^(Parity)|(MetaMask)$/);
    expect(web3.version().network).toMatch(/^[0-9]+$/);
    expect(web3.version().ethereum).toMatch(/^[0-9]+$/);
  });
});