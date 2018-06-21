import PrivateService from '../../core/PrivateService';
import { slug } from '../index';
import EventEmitter from './EventEmitter';

export default class EventService extends PrivateService {
  /**
   * @param {string} name
   */
  constructor(name = 'event') {
    super(name, ['log']);

    this._block = null;
    // all of our emitters – we can have many of these
    // e.g. one for our maker object, a couple for some cdp objects, a few more on transaction objects, etc
    this.emitters = {};

    // this is our default emitter, it will likely be the maker object's personal emitter
    this.buildEmitter({ defaultEmitter: true });

    this.ping = this.ping.bind(this);
  }

  // check all of our active polls for new state
  // this is currently called on every new block from Web3Service
  ping(block) {
    Object.values(this.emitters).forEach(emitter => emitter.ping(block));
  }

  // add a event listener to an emitter
  on(event, listener, emitter = this._defaultEmitter()) {
    emitter.on(event, listener);
  }

  // push an event through an emitter
  emit(event, payload, block, emitter = this._defaultEmitter()) {
    emitter.emit(event, payload, block);
  }

  // remove a listener from an emitter
  removeListener(event, listener, emitter = this._defaultEmitter()) {
    emitter.removeListener(event, listener);
  }

  registerPollEvents(eventPayloadMap, emitter = this._defaultEmitter()) {
    return emitter.registerPollEvents(eventPayloadMap);
  }

  buildEmitter({ defaultEmitter = false } = {}) {
    const id = defaultEmitter ? 'default' : slug();
    const disposeEmitter = this._disposeEmitter.bind(this, id);
    const newEmitter = new EventEmitter(disposeEmitter);
    newEmitter.on('error', eventObj => this._logError(id, eventObj.payload));
    this.emitters[id] = newEmitter;
    return newEmitter;
  }

  _disposeEmitter(id) {
    if (id === 'default') {
      this._logError(id, 'cannot dispose default emitter');
    } else delete this.emitters[id];
  }

  _defaultEmitter() {
    return this.emitters.default;
  }

  _logError(name, msg) {
    this.get('log').error(`Problem encountered in emitter ${name} -> ${msg}`);
  }
}
