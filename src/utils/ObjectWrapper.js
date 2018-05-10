function _createFunctionProxy(wrapperObject, functionName, targetObject, handlers) {
  wrapperObject[functionName] = (...args) => targetObject[functionName].call(targetObject, ...args);
}

function _createGetterProxy(wrapperObject, propertyName, targetObject, handlers) {
  const getterName = _accessorName(propertyName, 'get');
  wrapperObject[getterName] = () => targetObject[propertyName];
}

function _createSetterProxy(wrapperObject, propertyName, targetObject, handlers) {
  const setterName = _accessorName(propertyName, 'set');
  wrapperObject[setterName] = v => {
    targetObject[propertyName] = v;
    return wrapperObject;
  };
}

function _collectAllPropertyNames(object, exclude = []) {
  let result = Object.getOwnPropertyNames(object).filter(
    p => exclude.indexOf(p) < 0
  );

  if (object.__proto__.__proto__) {
    result = result.concat(
      _collectAllPropertyNames(object.__proto__, exclude)
    );
  }

  return result.filter(p => p !== 'constructor');
}

function _accessorName(property, type) {
  return (
    type +
    property[0].toUpperCase() +
    (property.length > 1 ? property.substr(1) : '')
  );
}

function _isFunction(value) {
  return value && {}.toString.call(value) === '[object Function]';
}

export default class ObjectWrapper {

  static addWrapperInterface(
    wrapper,
    innerObject,
    exclude = [],
    createGetters = true,
    createSetters = true,
    excludeSemiPrivate = true,
    handlers = {}
  ) {
    _collectAllPropertyNames(innerObject, exclude).forEach(k => {
      if (excludeSemiPrivate && k[0] === '_') {
        // do nothing

      } else if (_isFunction(innerObject[k])) {
        _createFunctionProxy(wrapper, k, innerObject, handlers);

      } else {
        if (createGetters) {
          _createGetterProxy(wrapper, k, innerObject, handlers);
        }
        if (createSetters) {
          _createSetterProxy(wrapper, k, innerObject, handlers);
        }
      }
    });
  }
}