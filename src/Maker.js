import DefaultServiceProvider, {
  resolver
} from './config/DefaultServiceProvider';
import ConfigFactory from './config/ConfigFactory';
import { intersection, isEqual, mergeWith } from 'lodash';

/**
 * do not call `new Maker()` directly; use `Maker.create` instead
 */
export default class Maker {
  constructor(preset, options = {}) {
    const { plugins = [], ...otherOptions } = options;

    for (const [plugin, pluginOptions] of plugins) {
      if (plugin.addConfig) {
        mergeOptions(
          otherOptions,
          plugin.addConfig(otherOptions, pluginOptions)
        );
      }
    }

    const config = ConfigFactory.create(preset, otherOptions, resolver);
    this._container = new DefaultServiceProvider(config).buildContainer();

    for (let pluginTuple of plugins) {
      const [plugin, pluginOptions] = pluginTuple;
      if (typeof plugin === 'function') {
        plugin(this, config, pluginOptions);
      } else if (plugin.afterCreate) {
        plugin.afterCreate(this, config, pluginOptions);
      }
    }

    if (otherOptions.autoAuthenticate !== false) this.authenticate();

    delegateToServices(this, {
      accounts: [
        'addAccount',
        'currentAccount',
        'currentAddress',
        'listAccounts',
        'useAccount',
        'useAccountWithAddress'
      ],
      cdp: ['getCdp', 'openCdp', 'getCdpIds'],
      event: ['on'],
      proxy: ['currentProxy'],
      token: ['getToken']
    });
  }

  authenticate() {
    if (!this._authenticatedPromise) {
      this._authenticatedPromise = this._container.authenticate();
    }
    return this._authenticatedPromise;
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

function delegateToServices(maker, services) {
  for (const serviceName in services) {
    for (const methodName of services[serviceName]) {
      maker[methodName] = (...args) =>
        maker.service(serviceName)[methodName](...args);
    }
  }
}

function mergeOptions(object, source) {
  return mergeWith(object, source, (objValue, srcValue, key) => {
    if (key === 'addContracts') {
      const dupes = intersection(
        Object.keys(objValue || {}),
        Object.keys(srcValue)
      ).filter(key => !isEqual(objValue[key], srcValue[key]));

      if (dupes.length > 0) {
        const label = `Contract${dupes.length > 1 ? 's' : ''}`;
        const names = dupes.map(d => `"${d}"`).join(', ');
        throw new Error(`${label} ${names} cannot be defined more than once`);
      }
    }

    if (Array.isArray(objValue)) return objValue.concat(srcValue);

    // when this function returns undefined, mergeWith falls back to the
    // default merging behavior.
    // https://devdocs.io/lodash~4/index#mergeWith
  });
}

Maker.create = async function(...args) {
  const [preset, options = {}] = args;
  const { plugins } = options;

  if (plugins) {
    // If its not already, format the plugin to be a tuple
    // of type [plugin, options object].
    const pluginTuples = plugins.map(
      plugin => (!Array.isArray(plugin) ? [plugin, {}] : plugin)
    );
    for (const [plugin, pluginOptions] of pluginTuples) {
      if (plugin.beforeCreate) {
        const resultOptions = await plugin.beforeCreate(pluginOptions);
        Object.assign(options, resultOptions);
      }
    }
    // reassign the plugins array in the options
    options.plugins = pluginTuples;
  }

  const maker = new Maker(preset, options);
  if (options.autoAuthenticate !== false) await maker.authenticate();
  return maker;
};
