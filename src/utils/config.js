import merge from 'lodash.merge';

export const defaultServices = {
  allowance: 'AllowanceService',
  cdp: 'EthereumCdpService',
  conversionService: 'TokenConversionService',
  event: 'EventService',
  // exchange: intentionally omitted
  gasEstimator: 'GasEstimatorService',
  log: 'ConsoleLogger',
  price: 'PriceService',
  smartContract: 'SmartContractService',
  timer: 'TimerService',
  token: 'EthereumTokenService',
  transactionManager: 'TransactionManager',
  web3: 'Web3Service'
};

const disabledServices = {
  log: 'NullLogger'
};

function resolveNameForBoolean(role, bool) {
  let name;
  if (bool) {
    name = defaultServices[role];
    if (!name) throw new Error(`The "${role}" service has no default`);
  } else {
    name = disabledServices[role];
    if (!name) throw new Error(`The "${role}" service cannot be disabled`);
  }
  return name;
}

export function standardizeConfig(role, config, resolveDefaults = true) {
  if (config instanceof Array) {
    if (typeof config[0] == 'boolean' && resolveDefaults) {
      return [resolveNameForBoolean(role, config[0]), config[1]];
    }
    return config;
  }
  let className, settings;

  switch (typeof config) {
    case 'string':
      // handle a string that refers to a class name
      className = config;
      settings = {};
      break;
    case 'object':
      // handle a settings object -- use the default version
      className = resolveDefaults ? defaultServices[role] : true;
      settings = config;
      // TODO could also handle a service instance here
      break;
    case 'boolean':
      className = resolveDefaults
        ? resolveNameForBoolean(role, config)
        : config;
      settings = {};
      break;
    default:
      throw new Error(`could not parse settings for ${role}:`, config);
  }

  return [className, settings];
}

export function mergeServiceConfig(role, sink, source) {
  sink = standardizeConfig(role, sink);
  source = standardizeConfig(role, source, false);
  if (sink[0] === false || source[0] === false) return source;

  return [
    typeof source[0] != 'boolean' ? source[0] : sink[0],
    merge({}, sink[1], source[1])
  ];
}
