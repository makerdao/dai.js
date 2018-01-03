import Web3Service from './Web3Service';
import NullLoggerService from "../loggers/NullLogger/NullLoggerService";

test('should fetch version info on connect', (done) => {
  const
    log = new NullLoggerService(),
    web3 = new Web3Service();

  web3.manager().inject('log', log).connect().then(() => {
    expect(web3.version().api).toMatch(/^([0-9]+\.)*[0-9]+$/);
    expect(web3.version().node).toMatch(/^(Parity)|(MetaMask)$/);
    expect(web3.version().network).toMatch(/^[0-9]+$/);
    expect(web3.version().ethereum).toMatch(/^[0-9]+$/);

    done();
  });
});