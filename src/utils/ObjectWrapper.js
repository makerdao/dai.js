function _createFunctionProxy(
  wrapperObject,
  functionName,
  targetObject,
  handlers
) {
  wrapperObject[functionName] = (...args) => {
    handlers.onCall && handlers.onCall(functionName, args);
    const result = targetObject[functionName].call(targetObject, ...args);

    let modifiedResult = false;
    if (handlers.afterCall) {
      modifiedResult = handlers.afterCall(functionName, args, result);
    }

    return modifiedResult || result;
  };
}

function _createGetterProxy(
  wrapperObject,
  propertyName,
  targetObject,
  handlers
) {
  const getterName = _accessorName(propertyName, 'get');
  wrapperObject[getterName] = () => {
    handlers.onGet && handlers.onGet(propertyName);
    const result = targetObject[propertyName];
    handlers.afterGet && handlers.afterGet(propertyName, result);

    return result;
  };
}

function _createSetterProxy(
  wrapperObject,
  propertyName,
  targetObject,
  handlers
) {
  const setterName = _accessorName(propertyName, 'set');
  wrapperObject[setterName] = v => {
    handlers.onSet && handlers.onSet(propertyName, v);
    targetObject[propertyName] = v;
    handlers.afterSet && handlers.afterSet(propertyName, v, wrapperObject);

    return wrapperObject;
  };
}

function _collectAllPropertyNames(object, exclude = []) {
  let result = Object.getOwnPropertyNames(object).filter(
    p => exclude.indexOf(p) < 0
  );

  if (object.__proto__.__proto__) {
    result = result.concat(_collectAllPropertyNames(object.__proto__, exclude));
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

    return wrapper;
  }
}
