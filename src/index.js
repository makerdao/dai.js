import sayHello from './hello';
import './index.scss';
import Web3Service from './web3/Web3Service';

document.getElementById('root').innerHTML = sayHello();

const web3 = new Web3Service();
web3.manager()
  // eslint-disable-next-line
  .onInitialized(() => console.log('Web3 initalized.'))
  // eslint-disable-next-line
  .onConnected(() => console.log('Web3 connected.'))
  // eslint-disable-next-line
  .onDisconnected(() => console.log('Oops! Web3 disconnected.'))
  // eslint-disable-next-line
  .onAuthenticated(() => console.log('Web3 authenticated.'))
  // eslint-disable-next-line
  .onDeauthenticated(() => console.log('Oops! Web3 deauthenticated.'))
  .authenticate()
  .then(() => web3.disconnect())
  .then(() => web3.manager().connect());
