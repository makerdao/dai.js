export const tag = (strings, ...keys) => (...values) => {
  const dict = values[values.length - 1] || {};
  const result = [strings[0]];
  keys.forEach((key, i) =>
    result.push(Number.isInteger(key) ? values[key] : dict[key], strings[i + 1])
  );
  return result.join('');
};

export const validateAddress = (...args) => address =>
  !/^0x[0-9a-fA-F]{40}$/.test(address) && tag(...args)({ address });

export const validatProxyAddressResult = (...args) => (proxyAddress, [address]) =>
  proxyAddress === '0x0000000000000000000000000000000000000000' && tag(...args)({ address }); // prettier-ignore
