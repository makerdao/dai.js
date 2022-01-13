import { createGetCurrency } from '@makerdao/currency';
import BigNumber from 'bignumber.js';
import {
  MKR,
  STAGING_MAINNET_URL,
  KOVAN_URL,
  GOERLI_URL,
  MAINNET_URL
} from './constants';

/**
 * @desc get network name
 * @param  {Number|String} id
 * @return {String}
 */
export const netIdToName = id => {
  switch (parseInt(id, 10)) {
    case 1:
      return 'mainnet';
    case 5:
      return 'goerli';
    case 42:
      return 'kovan';
    case 999:
      return 'ganache';
    case 1337:
      return 'testnet';
    case 31337:
      return 'goerlifork';
    default:
      return '';
  }
};

export const netIdtoSpockUrl = id => {
  switch (parseInt(id, 10)) {
    case 1:
      return MAINNET_URL;
    case 5:
    case 1337:
    case 31337:
      return GOERLI_URL;
    case 42:
      return KOVAN_URL;
    default:
      return STAGING_MAINNET_URL;
  }
};

export const netIdtoSpockUrlStaging = id => {
  switch (parseInt(id, 10)) {
    case 1:
      return STAGING_MAINNET_URL;
    case 5:
    case 1337:
    case 31337:
      return GOERLI_URL;
    case 42:
      return KOVAN_URL;
    default:
      return STAGING_MAINNET_URL;
  }
};

export const getCurrency = createGetCurrency({ MKR });

export const paddedArray = (k, value) =>
  Array.from({ length: k })
    .map(() => 0)
    .concat(...value);

export const toBuffer = (number, opts) => {
  let buf;
  let len;
  let endian;
  let hex = new BigNumber(number).toString(16);
  let size;
  let hx;

  if (!opts) {
    opts = {};
  }

  endian = { 1: 'big', '-1': 'little' }[opts.endian] || opts.endian || 'big';

  if (hex.charAt(0) === '-') {
    throw new Error('Converting negative numbers to Buffers not supported yet');
  }

  size = opts.size === 'auto' ? Math.ceil(hex.length / 2) : opts.size || 1;

  len = Math.ceil(hex.length / (2 * size)) * size;
  buf = Buffer.alloc(len);

  // Zero-pad the hex string so the chunks are all `size` long
  while (hex.length < 2 * len) {
    hex = `0${hex}`;
  }

  hx = hex.split(new RegExp(`(.{${2 * size}})`)).filter(s => s.length > 0);

  hx.forEach((chunk, i) => {
    for (var j = 0; j < size; j++) {
      var ix = i * size + (endian === 'big' ? j : size - j - 1);
      buf[ix] = parseInt(chunk.slice(j * 2, j * 2 + 2), 16);
    }
  });

  return buf;
};

export const fromBuffer = (buf, opts) => {
  if (!opts) {
    opts = {};
  }

  var endian =
    { 1: 'big', '-1': 'little' }[opts.endian] || opts.endian || 'big';

  var size = opts.size === 'auto' ? Math.ceil(buf.length) : opts.size || 1;

  if (buf.length % size !== 0) {
    throw new RangeError(
      `Buffer length (${buf.length}) must be a multiple of size (${size})`
    );
  }

  var hex = [];
  for (var i = 0; i < buf.length; i += size) {
    var chunk = [];
    for (var j = 0; j < size; j++) {
      chunk.push(buf[i + (endian === 'big' ? j : size - j - 1)]);
    }

    hex.push(chunk.map(c => (c < 16 ? '0' : '') + c.toString(16)).join(''));
  }

  return new BigNumber(hex.join(''), 16);
};
