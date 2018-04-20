export default class Cdp {
  constructor(cdpService, cdpId) {
    this._service = cdpService;
    this._id = cdpId;
  }

  shut() {
    return this._service.shutCdp(this._id);
  }

  getInfo() {
    return this._service.getCdpInfo(this._id);
  }
}
