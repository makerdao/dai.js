class Web3ServiceList {
  constructor() {
    this._list = [];
  }

  push(service) {
    this._list.push(service);
  }

  disconnectAll() {
    this._list.forEach(s => {
      //console.log('about to force disconnect');
      s.manager()._disconnect();
      //console.log('done force disconnecting');
    });
    this._list = [];
  }
}

// eslint-disable-next-line
const l = new Web3ServiceList();
export default l;
