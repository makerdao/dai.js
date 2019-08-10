import merge from 'lodash/merge';
import { standardizeConfig } from '@makerdao/services-core';

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
