export default class Service {

  constructor(name, dependencies = []) {
    if (!name) {
      throw new Error('Service name must not be empty.');
    }

    this._name = name;
    this._deps = dependencies;
  }

  getName() {
    return this._name;
  }

  getDependencies() {
    return this._deps;
  }

  initialize() {
    return Promise.resolve(true);
  }

  connect() {
    return Promise.resolve(true);
  }

}