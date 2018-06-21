import { createMemoizedPoll, createPayloadFetcher } from './helpers';
import EventEmitterObj from 'eventemitter2';
const { EventEmitter2 } = EventEmitterObj;

export default class EventEmitter {
  constructor(disposeSelf) {
    this._emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '/'
    });
    this._polls = [];
    this._block = null;
    this._sequenceNum = 1;
    this._disposeSelf = disposeSelf;
    this.emit = this.emit.bind(this);
  }

  emit(event, payload = {}, block = this._getBlock()) {
    // if nobody's listening for this event, don't actually emit it
    if (this._emitter.listeners(event).length === 0) return;
    const eventObj = {
      payload,
      block,
      type: event,
      sequence: this._sequenceNum
    };
    this._sequenceNum++;
    this._emitter.emit(event, eventObj);
  }

  on(event, listener) {
    this._emitter.on(event, listener);
    // start polling for state changes if the associated event now has a listener
    this._polls.forEach(
      poll => this._emitter.listeners(poll.type()).length > 0 && poll.heat()
    );
  }

  removeListener(event, listener) {
    this._emitter.removeListener(event, listener);
    // stop polling for state changes if the associated event no longer has a listener
    this._polls.forEach(
      poll => this._emitter.listeners(poll.type()).length === 0 && poll.cool()
    );
  }

  registerPollEvents(eventPayloadMap) {
    for (const [eventType, payloadGetterMap] of Object.entries(
      eventPayloadMap
    )) {
      const payloadFetcher = createPayloadFetcher(payloadGetterMap);
      const memoizedPoll = createMemoizedPoll({
        type: eventType,
        emit: this.emit,
        getState: payloadFetcher
      });
      this._polls.push(memoizedPoll);
    }
    return this;
  }

  ping(block) {
    this._setBlock(block);
    this._polls.forEach(poll => poll.ping());
  }

  dispose() {
    this.emit = () => {};
    this.on = () => {};
    this._disposeSelf();
  }

  _setBlock(block) {
    if (block !== undefined) this._block = block;
  }

  _getBlock() {
    return this._block;
  }

  // For testing

  _startPolls() {
    this._polls.forEach(poll => poll.heat());
  }

  _stopPolls() {
    this._polls.forEach(poll => poll.cool());
  }
}
