export default class CdpWrapper {
  constructor(cdpService, cdpId) {
    this._service = cdpService;
    this._id = cdpId;
  }

  open() {
    return this._service.openCdp();
  }

  shut() {
    return this._service.shutCdp(this._id);
  }

  getInfo() {
    return this._service.getCdpInfo(this._id);
  }
}
