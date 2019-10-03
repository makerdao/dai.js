import ServiceBase from './ServiceBase';

export default function standardizeConfig(role, config, resolver) {
  if (config instanceof Array) {
    if (typeof config[0] == 'boolean' && resolver) {
      return [resolveNameForBoolean(role, config[0], resolver), config[1]];
    }
    return config;
  }
  let className,
    settings = {};

  switch (typeof config) {
    case 'string':
      // handle a string that refers to a class name
      className = config;
      break;
    case 'function':
      // handle a service constructor
      className = config;
      break;
    case 'object':
      if (config instanceof ServiceBase) {
        // handle a service instance
        className = config;
      } else {
        // handle a settings object -- use the default version
        className = resolver
          ? resolveNameForBoolean(role, true, resolver)
          : true;
        settings = config;
      }
      break;
    case 'boolean':
      className = resolver
        ? resolveNameForBoolean(role, config, resolver)
        : config;
      break;
    default:
      throw new Error(`could not parse settings for ${role}:`, config);
  }

  return [className, settings];
}

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
