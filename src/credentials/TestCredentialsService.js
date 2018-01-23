import LocalService from '../services/LocalService';

export default class TestCredentialsService extends LocalService {
  /**
   * @param {string} loginName
   * @param {string} password
   * @param {string} name
   */
  constructor(loginName, password, name = 'TestCredentials') {
    super(name, []);
    this._loginName = loginName;
    this._password = password;
  }

  getCredentials() {
    return new Promise((resolve) => {
      resolve([{ loginName: this._loginName, password: this._password }]);
    });
  }
}

