import './index.scss';
import Web3Service from './web3/Web3Service';
import BunyanService from './loggers/bunyan/BunyanService';

const
  bunyan = new BunyanService(),
  web3 = new Web3Service();

web3
  .manager().inject('log', bunyan)
  .authenticate()
  .then(() => web3.disconnect())
  .then(() => web3.manager().connect());
