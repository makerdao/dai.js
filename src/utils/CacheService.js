import LocalService from '../core/LocalService';

export default class CacheService extends LocalService {
  // TODO pass in global object as storage argument
  constructor(name = 'cache') {
    super(name);
  }

  initialize(settings = {}) {
    this._storage = settings.storage || {};
  }

  has(key) {
    return key in this._storage;
  }

  fetch(key) {
    return this._storage[key];
  }

  store(key, value) {
    this._storage[key] = value;
  }
}
