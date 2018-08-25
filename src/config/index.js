import merge from 'lodash.merge';

function resolveNameForBoolean(role, bool, { defaults, disabled }) {
  let name;
  if (bool) {
    name = defaults[role];
    if (!name) throw new Error(`The "${role}" service has no default`);
  } else {
    name = disabled[role];
    if (!name) throw new Error(`The "${role}" service cannot be disabled`);
  }
  return name;
}

export function standardizeConfig(role, config, resolver) {
  if (config instanceof Array) {
    if (typeof config[0] == 'boolean' && resolver) {
      return [resolveNameForBoolean(role, config[0], resolver), config[1]];
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
    case 'function':
      // handle a service constructor
      className = config;
      settings = {};
      break;
    case 'object':
      // handle a settings object -- use the default version
      className = resolver ? resolveNameForBoolean(role, true, resolver) : true;
      settings = config;
      // TODO could also handle a service instance or constructor here
      break;
    case 'boolean':
      className = resolver
        ? resolveNameForBoolean(role, config, resolver)
        : config;
      settings = {};
      break;
    default:
      throw new Error(`could not parse settings for ${role}:`, config);
  }

  return [className, settings];
}

export function mergeServiceConfig(role, sink, source, resolver) {
  sink = standardizeConfig(role, sink, resolver);
  source = standardizeConfig(role, source);
  if (sink[0] === false || source[0] === false) return source;

  return [
    typeof source[0] != 'boolean' ? source[0] : sink[0],
    merge({}, sink[1], source[1])
  ];
}

export function getSettings(config) {
  if (config instanceof Array) return config[1];
  return config;
}
