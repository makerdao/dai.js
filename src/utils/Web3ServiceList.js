class Web3ServiceList {
  constructor() {
    this._list = [];
  }

  push(service) {
    this._list.push(service);
  }

  disconnectAll() {
    this._list.forEach(s => s.manager()._disconnect());
    this._list = [];
  }
}

// eslint-disable-next-line
const l = new Web3ServiceList();
export default l;
