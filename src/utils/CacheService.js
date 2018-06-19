import LocalService from '../core/LocalService';

export default class CacheService extends LocalService {
  constructor(name = 'cache') {
    super(name);
  }

  initialize(settings = {}) {
    if (settings.storage) {
      this._storage = settings.storage;
    }
  }

  isEnabled() {
    return !!this._storage;
  }

  has(key) {
    return !!this._storage && key in this._storage;
  }

  fetch(key) {
    return this._storage ? this._storage[key] : undefined;
  }

  store(key, value) {
    if (this._storage) this._storage[key] = value;
  }
}
