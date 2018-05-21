import './index.scss';
import Maker from '../src/Maker';
import ConfigFactory from '../src/utils/ConfigFactory';
import Web3ProviderType from '../src/eth/Web3ProviderType';
import tokens from '../contracts/tokens';
import Vue from 'vue';
import MakerDebugger from '../components/MakerDebugger.vue';

function updateInfo(cdp) {
  return Promise.all([
    cdp.getCdpId(),
    cdp.getInfo(),
    window.maker.service('token').getToken(tokens.DAI).balanceOf(
      window.maker.service('web3').defaultAccount()
    )
  ])
  .then(() => {
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
  const config = ConfigFactory.create('decentralized-oasis-without-proxies'),
    param = new URL(window.location.href).searchParams.get('inject') || '',
    useMetaMask = param.length > 0 && param !== '0';

  config.services.web3[1] = {
    statusTimerDelay: useMetaMask ? 30000 : 5000,
    usePresetProvider: useMetaMask,
    provider: {
      type: Web3ProviderType.HTTP,
      url: window.location.protocol + '//' + window.location.hostname + ':2000'
    }
  };

  window.maker = new Maker(config);

  window.maker.authenticate().then(() => {
    window.vm = new Vue({
      el: '#maker-dbg-container',
      render: createElement => createElement('maker-debugger', {
        props: {
          maker: window.maker
        }
      }),
      components: { MakerDebugger }
    });

    let cdp = null;
    window.maker.openCdp()
      .then(x => updateInfo(cdp = x))
      .then(() => cdp.lockEth('0.1'))
      .then(() => updateInfo(cdp))
      .then(() => cdp.drawDai(20))
      .then(() => updateInfo(cdp));
  });

}, 500);
