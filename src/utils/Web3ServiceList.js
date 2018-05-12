class Web3ServiceList {
  constructor() {
    this._list = [];
  }

  push(service) {
    //put a warning if this list is length 2 or more
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
