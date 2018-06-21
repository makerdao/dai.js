class Web3ServiceList {
  constructor() {
    this._list = [];
  }

  push(service) {
    //put a warning if this list is length 2 or more
    this._list.push(service);
  }

  disconnectAll() {
    return Promise.all(this._list, s => s.manager()._disconnect()).then(
      () => (this._list = [])
    );
  }
}

// eslint-disable-next-line
const l = new Web3ServiceList();
export default l;
