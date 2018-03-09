import './index.scss';
//import Web3Service from '../src-old/web3/Web3Service';
import BunyanService from '../src/utils/loggers/BunyanLogger';

const
  bunyan = new BunyanService();
  //web3 = new Web3Service();

/*web3
  .manager().inject('log', bunyan)
  .authenticate()
  .then(() => web3.disconnect())
  .then(() => web3.manager().connect());
*/

bunyan.info('This is the Bunyan logger service!');