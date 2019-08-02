// FIXME these were just copied from mcd-cdp-portal;
// should use a standard library for this sort of thing

export function toHex(str, { with0x = true, rightPadding = 64 } = {}) {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  if (rightPadding > 0) result = padRight(result, rightPadding);
  return with0x ? '0x' + result : result;
}

export function padRight(string, chars, sign) {
  return string + new Array(chars - string.length + 1).join(sign ? sign : '0');
}
