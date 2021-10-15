import DefaultServiceProvider, {
  resolver
} from './config/DefaultServiceProvider';
import ConfigFactory from './config/ConfigFactory';
import { mergeWith, cloneDeep, uniq, has } from 'lodash';

import { strict as assert } from 'assert';

// a plugin must be either an object with at least one of these keys defined, or
// a single function, which will be treated as the value for `afterCreate`.
const PLUGIN_KEYS = ['beforeCreate', 'afterCreate', 'addConfig'];

/**
 * do not call `new Maker()` directly; use `Maker.create` instead
 */
export class MakerClass {
  _container: any;
  _authenticatedPromise: Promise<any>;
  currencies: any;
  QueryApi: any;
  utils: any;

  constructor(preset, options: any = {}, userOptions: any = {}) {
    const { plugins = [], ...otherOptions } = options;

    for (const [plugin, pluginOptions] of plugins) {
      if (plugin.addConfig) {
        mergeOptions(
          otherOptions,
          plugin.addConfig(otherOptions, pluginOptions)
        );
      }
    }
    // This ensures user supplied config options always take priority
    if (plugins && userOptions) mergeOptions(otherOptions, userOptions);

    const config = ConfigFactory.createConfig(preset, otherOptions, resolver);
    this._container = new DefaultServiceProvider(config).buildContainer();

    for (const [plugin, pluginOptions] of plugins) {
      if (plugin.afterCreate) plugin.afterCreate(this, config, pluginOptions);
    }

    if (otherOptions.autoAuthenticate !== false) this.authenticate();
  }

  authenticate() {
    if (!this._authenticatedPromise) {
      this._authenticatedPromise = this._container.authenticate();
    }
    return this._authenticatedPromise;
  }

  // shorthand methods
  addAccount(...args) {
    return this.service('accounts').addAccount(...args);
  }

  currentAccount(...args) {
    return this.service('accounts').currentAccount(...args);
  }

  listAccounts(...args) {
    return this.service('accounts').listAccounts(...args);
  }

  useAccount(...args) {
    return this.service('accounts').useAccount(...args);
  }

  useAccountWithAddress(...args) {
    return this.service('accounts').useAccountWithAddress(...args);
  }

  currentAddress(...args) {
    return this.service('accounts').currentAddress(...args);
  }
  
  on(...args) {
    return this.service('event').on(...args);
  }
  
  getToken(...args) {
    return this.service('token').getToken(...args);
  }

  currentProxy(...args) {
    return this.service('proxy').currentProxy(...args);
  }

  watch(...args) {
    return this.service('multicall').watch(...args);
  }

  latest(...args) {
    return this.service('multicall').latest(...args);
  }

  openCdp() {
    throw new Error(
      '"openCdp" is no longer available here. Add @makerdao/dai-plugin-scd, then use maker.service(\'cdp\').openCdp'
    );
  }

  getCdp() {
    throw new Error(
      '"getCdp" is no longer available here. Add @makerdao/dai-plugin-scd, then use maker.service(\'cdp\').getCdp'
    );
  }

  getCdpIds() {
    throw new Error(
      '"getCdpIds" is no longer available here. Add @makerdao/dai-plugin-scd, then use maker.service(\'cdp\').getCdpIds'
    );
  }
  // skipAuthCheck should only be set if you're sure you don't need the service
  // to be initialized yet, e.g. when setting up a plugin
  service(service, skipAuthCheck = false) {
    const skipAuthCheckForServices = ['event'];
    if (
      !skipAuthCheck &&
      !this._container.isAuthenticated &&
      !skipAuthCheckForServices.includes(service)
    ) {
      throw new Error(
        `Can't use service ${service} before authenticate() has finished.`
      );
    }
    return this._container.service(service);
  }
}

function mergeOptions(object, source) {
  return mergeWith(object, source, (objValue, srcValue, key) => {
    if (Array.isArray(objValue) && key === 'abi') return uniq(objValue);

    if (Array.isArray(objValue) && key !== 'abi')
      return uniq(objValue.concat(srcValue));
    // when this function returns undefined, mergeWith falls back to the
    // default merging behavior.
    // https://devdocs.io/lodash~4/index#mergeWith
  });
}

const standardizePluginConfig = plugins =>
  plugins.map((x, i) => {
    let [plugin, pluginOptions] = Array.isArray(x) ? x : [x, {}];
    if (typeof plugin === 'function') plugin = { afterCreate: plugin };

    assert(
      PLUGIN_KEYS.some(x => has(plugin, x)),
      `plugins[${i}] does not seem to be a plugin`
    );

    return [plugin, pluginOptions];
  });

async function create(...args) {
  const [preset, options = {}] = args;
  const { plugins, ...otherOptions } = options;

  // Preserve the user supplied options to apply after plugins are executed.
  const userOptions = cloneDeep(otherOptions);

  if (plugins) {
    options.plugins = standardizePluginConfig(plugins);
    for (const [p, popts] of options.plugins) {
      // the beforeCreate function can return new options to be sent to the
      // Maker constructor
      if (p.beforeCreate) Object.assign(options, await p.beforeCreate(popts));
    }
  }

  const maker = new MakerClass(preset, options, userOptions);
  if (options.autoAuthenticate !== false) await maker.authenticate();
  return maker;
}

const Maker = {
  create,
  currencies: null,
  QueryApi: null,
  utils: null
};

export default Maker;
