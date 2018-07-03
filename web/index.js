import './index.scss';
import Maker from '../src/Maker';
import tokens from '../contracts/tokens';
import Vue from 'vue';
import MakerDebugger from './components/MakerDebugger.vue';

function updateInfo(cdp) {
  return Promise.all([
    cdp.getId(),
    cdp.getInfo(),
    window.maker
      .service('token')
      .getToken(tokens.DAI)
      .balanceOf(window.maker.service('web3').defaultAccount())
  ]).then(() => {
    /*
    const id = results[0], info = {};
    Object.keys(results[1]).forEach(k => info[k] = results[1][k].toString());

    window.document.getElementById('cdp-output').innerHTML = `<div>
            <h3>CDP ${id}</h3>
            <ul class="objectFields">
                <li><strong>lad:</strong> ${info.lad}</li>
                <li><strong>art:</strong> ${info.art}</li>
                <li><strong>ink:</strong> ${info.ink}</li>
                <li><strong>ire:</strong> ${info.ire}</li>
            </ul>
            <h3>DAI: ${results[2].toString()}</h3>
            <a href="/?inject=${usingMetaMask ? '0' : '1'}">${usingMetaMask ? 'disable' : 'enable'} metamask</a>
        </div>`;
    */

    return cdp;
  });
}

window.document.getElementsByTagName('body')[0].innerHTML =
  '<div id="cdp-output"></div><div id="maker-dbg-container"></div>';

setTimeout(() => {
  const param = new URL(window.location.href).searchParams.get('inject') || '',
    useMetaMask = param.length > 0 && param !== '0';

  // window.maker = new Maker('kovan', {
  // window.maker = new Maker('http', {
  window.maker = new Maker('test', {
    // url: window.location.protocol + '//' + window.location.hostname + ':' + (window.location.protocol === 'https:' ? '9000/web3' : '2000'),
    web3: {
      statusTimerDelay: useMetaMask ? 30000 : 5000,
      usePresetProvider: useMetaMask,
      useHardwareWallet: 'ledger'
    }
  });

  window.maker.authenticate().then(() => {
    console.log('Authenticated!');
    window.vm = new Vue({
      el: '#maker-dbg-container',
      render: createElement =>
        createElement('maker-debugger', {
          props: {
            maker: window.maker
          }
        }),
      components: { MakerDebugger }
    });

    let web3Service = window.maker.service('web3');
    let checkHWWalletFirstAccount = web3Service.defaultAccount();
    console.log('checkHWWalletFirstAccount', checkHWWalletFirstAccount);

    let cdp = null;
    window.maker
      .openCdp()
      .then(x => updateInfo((cdp = x)))
      .then(() => cdp.lockEth('0.1'))
      .then(() => updateInfo(cdp))
      .then(() => cdp.drawDai(20))
      .then(() => updateInfo(cdp));
  });
}, 500);
