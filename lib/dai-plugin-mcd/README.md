# dai-plugin-mcd

A [Dai.js](https://github.com/makerdao/dai.js) plugin for interacting with the
multi-collateral dai contracts

### Example usage

```js
import McdPlugin, { ETH, MDAI } from '@makerdao/dai-plugin-mcd';
import Maker from '@makerdao/dai';

const maker = await Maker.create('http', {
  // ...other configuration...
  plugins: [
    [
      McdPlugin,
      { cdpTypes: [ { currency: ETH, name: 'FOO' } ] }
    ]
  ]
});

await maker.service('proxy').ensureProxy();
const cdpManager = maker.service('mcd:cdpManager');
const cdp = await cdpManager.openLockAndDraw('FOO', ETH(50), MDAI(1000));
```

### Functionality

- Creating and manipulating CDPs (via the [CDP Manager](https://github.com/makerdao/dss-cdp-manager) via a user's [DSProxy](https://github.com/dapphub/ds-proxy))
- Reading data about the MCD system.

### Notes

The MCD contracts store the stability fee per second in a variable called `tax`
as a number in the form 1.X _ 10^27 (e.g. `1000000000472114805215157978`), and
the base rate in a variable called `repo` as a number in the form 0.X _ 10^27.

In this plugin, the `getAnnualStabilityFee()` and get `getAnnualBaseRate`
functions convert those values to return a decimal representation of the yearly
rates (e.g. `0.015` and `0.01`).

Run the tests from the top-level dai.js directory.
