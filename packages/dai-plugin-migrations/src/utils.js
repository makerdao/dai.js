import assert from 'assert';
import padStart from 'lodash/padStart';

export function stringToBytes(str) {
  assert(!!str, 'argument is falsy');
  assert(typeof str === 'string', 'argument is not a string');
  return '0x' + Buffer.from(str).toString('hex');
}

export function getIdBytes(id, prefix = true) {
  assert(typeof id === 'number', 'ID must be a number');
  return (prefix ? '0x' : '') + padStart(id.toString(16), 64, '0');
}
