import { createMemoizedPoll, createPayloadFetcher } from './helpers';
import EventEmitterObj from 'eventemitter2';
const { EventEmitter2 } = EventEmitterObj;

export default class EventEmitter {
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
            sequence: this.sequencer()
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
            const payloadFetcher = createPayloadFetcher(
                payloadGetterMap
            );
            const memoizedPoll = createMemoizedPoll({
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
        this.emit = () => { };
        this.on = () => { };
        this.disposer();
    }

    // For testing

    _startPolls() {
        this.polls.forEach(poll => poll.heat());
    }

    _stopPolls() {
        this.polls.forEach(poll => poll.cool());
    }
}