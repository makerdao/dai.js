import PrivateService from '../core/PrivateService';
import { sequencerFactory, slug } from './index';
import isEqual from 'lodash.isequal';
import EventEmitterObj from 'eventemitter2';

const { EventEmitter2 } = EventEmitterObj;

class EventEmitter {
  constructor({ disposer, getBlock, sequencer }) {
    this._emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '/'
    });
    this.polls = [];
    this.disposer = disposer;
    this.sequencer = sequencer;
    this.getBlock = getBlock;
    this.emit = this.emit.bind(this);
  }

  emit(event, payload = {}, block = this.getBlock()) {
    // if nobody's listening for this event, don't actually emit it
    if (this._emitter.listeners(event).length === 0) return;
    const eventObj = {
      payload,
      block,
      type: event,
      index: this.sequencer()
    };
    this._emitter.emit(event, eventObj);
  }

  on(event, listener) {
    this._emitter.on(event, listener);
    // start polling for state changes if the associated event now has a listener
    this.polls.forEach(
      poll => this._emitter.listeners(poll.type()).length > 0 && poll.heat()
    );
  }

  removeListener(event, listener) {
    this._emitter.removeListener(event, listener);
    // stop polling for state changes if the associated event no longer has a listener
    this.polls.forEach(
      poll => this._emitter.listeners(poll.type()).length === 0 && poll.cool()
    );
  }

  registerPollEvents(eventPayloadMap) {
    for (const [eventType, payloadGetterMap] of Object.entries(
      eventPayloadMap
    )) {
      const payloadFetcher = EventEmitter._createPayloadFetcher(
        payloadGetterMap
      );
      const memoizedPoll = EventEmitter._createMemoizedPoll({
        type: eventType,
        emit: this.emit,
        getState: payloadFetcher
      });
      this.polls.push(memoizedPoll);
    }
    return this;
  }

  ping() {
    this.polls.forEach(poll => poll.ping());
  }

  dispose() {
    this.emit = () => {};
    this.on = () => {};
    this.disposer();
  }

  // For testing

  _startPolls() {
    this.polls.forEach(poll => poll.heat());
  }

  _stopPolls() {
    this.polls.forEach(poll => poll.cool());
  }

  //////////////////////////////
  /////  Polling Helpers  //////
  //////////////////////////////

  static _createPayloadFetcher(payloadGetterMap) {
    return () => {
      return Promise.all(
        Object.entries(payloadGetterMap).map(([key, getter]) =>
          getter().then(state => [key, state])
        )
      ).then(states => {
        const payload = {};
        for (const [key, state] of states) {
          payload[key] = state;
        }
        return payload;
      });
    };
  }

  static _createMemoizedPoll({
    type,
    getState,
    emit,
    curr = {},
    live = false
  }) {
    return {
      async ping() {
        if (!live) return;
        try {
          const next = await getState();
          if (!isEqual(curr, next)) {
            emit(type, next);
            curr = next;
          }
        } catch (err) {
          const msg = `Failed to get latest ${type} state. Message: ${err}`;
          emit('error', msg);
        }
      },
      async heat() {
        if (live) return;
        try {
          curr = await getState();
          live = true;
        } catch (err) {
          const msg = `Failed to get initial ${type} state. Message: ${err}`;
          emit('error', msg);
        }
      },
      cool() {
        if (!live) return;
        live = false;
      },
      type() {
        return type;
      },
      live() {
        return live;
      }
    };
  }
}

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
    this._setBlock(block);
    Object.values(this.emitters).forEach(emitter => emitter.ping());
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
    const _slug = slug();
    const id = defaultEmitter ? 'default' : _slug;
    const newEmitter = new EventEmitter({
      disposer: this._disposeEmitter.bind(this, id),
      getBlock: this._getBlock.bind(this),
      sequencer: sequencerFactory()
    });
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

  _setBlock(block) {
    if (block !== undefined) this._block = block;
  }

  _getBlock() {
    return this._block;
  }

  _logError(name, msg) {
    this.get('log').error(`Problem encountered in emitter ${name}: ${msg}`);
  }
}
