# dai-plugin-mcd

A [Dai.js](https://github.com/makerdao/dai.js) plugin for interacting with the
multi-collateral dai contracts

### Example usage

```js
import { McdPlugin, ETH, REP, MDAI } from '@makerdao/dai-plugin-mcd';
import Maker from '@makerdao/dai';
import { createCurrency } from '@makerdao/currency';
import { tokenAddress, tokenAbi } from 'someOtherTokenData';

const TOK = createCurrency('TOK');

const maker = await Maker.create('http', {
  // ...other configuration...
  plugins: [
    [
      McdPlugin,
      {
        // omit this option to get the default set:
        // ETH-A, ETH-B, REP-A
        cdpTypes: [
          { currency: ETH, ilk: 'ETH-A' },
          { currency: REP, ilk: 'REP-A' },
          { currency: TOK, ilk: 'TOK-Z', address: tokenAddress, abi: tokenAbi },
        ]
      }
    ]
  ]
});

await maker.service('proxy').ensureProxy();
const cdpManager = maker.service('mcd:cdpManager');
const cdp1 = await cdpManager.openLockAndDraw('REP-A', REP(50), MDAI(1000));
const cdp2 = await cdpManager.openLockAndDraw('ETH-A', ETH(50), MDAI(1000));
const cdp3 = await cdpManager.openLockAndDraw('TOK-Z', TOK(50), MDAI(1000));
```

Please visit [docs.makerdao.com](https://docs.makerdao.com/building-with-maker/daijs) for more documentation.

### Developer notes

The MCD contracts store the stability fee per second in a variable called `tax`
as a number in the form 1.X _ 10^27 (e.g. `1000000000472114805215157978`), and
the base rate in a variable called `repo` as a number in the form 0.X _ 10^27.

In this plugin, the `getAnnualStabilityFee()` and get `getAnnualBaseRate`
functions convert those values to return a decimal representation of the yearly
rates (e.g. `0.015` and `0.01`).

Run the tests from the top-level dai.js directory.

### Local Development

Due to the way that Babel7 handles transpilation it is not possible to use `yarn link` when locally developing this plugin, and importing it. We recommend using [yalc](https://github.com/whitecolor/yalc) instead. We've also found that a watcher tool called [sane](https://github.com/amasad/sane) is helpful.

Steps to Run:
1. In this directory run ```sane "yalc publish && cd [INSERT THE DIRECTORY OF THE PROJECT THAT IS IMPORTING THIS PLUGIN] && yalc link @makerdao/dai-plugin-mcd" src --wait=3 ```
