// run this with babel-node:
// > npx babel-node scripts/showServiceDependencies.js

import DefaultServiceProvider, { resolver } from '../src/config/DefaultServiceProvider';
import chalk from 'chalk';
import times from 'lodash.times';


const colors = [
  '#e6194b',
  '#3cb44b',
  '#ffe119',
  '#0082c8',
  '#f58231',
  '#911eb4',
  '#46f0f0',
  '#f032e6',
  '#d2f53c',
  '#fabebe',
  '#008080',
  '#e6beff',
  '#aa6e28',
  '#fffac8',
  '#800000',
  '#aaffc3',
  '#808000',
  '#ffd8b1',
  '#000080',
  '#808080'
];

const colorMap = {};
let colorMapCounter = 0;

const colorize = function(serviceName) {
  if (!colorMap[serviceName]) {
    if (colorMapCounter >= colors.length) {
      return chalk.reset(serviceName);
    }
    colorMap[serviceName] = colors[colorMapCounter];
    colorMapCounter++;
  }

  return chalk.hex(colorMap[serviceName]).bold(serviceName);
};

const NAME_MAX_LENGTH = 18;

function colorizeAndPad(name) {
  return [colorize(name)]
    .concat(times(NAME_MAX_LENGTH - name.length, () => ' '))
    .join('');
}

const config = Object.keys(resolver.defaults).reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, {});
const container = new DefaultServiceProvider(config).buildContainer();
for (let key of Object.keys(container._services).sort()) {
  const service = container._services[key];
  const name = service.manager().name();
  const depNames = service.manager().dependencies();
  console.log(
    `${colorizeAndPad(name)} : ${depNames.sort().map(colorize).join(', ') ||
      'none'}`
  );
}
