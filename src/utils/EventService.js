import LocalService from '../core/LocalService';
import { eventIndexer } from './index';
import isEqual from 'lodash.isequal';
import EventEmitterObj from 'eventemitter2';

const EventEmitter = EventEmitterObj.EventEmitter2;

let makerRegistry = {};

export const registerMakerEvents = eventGetterHash => {
  makerRegistry = { ...makerRegistry, ...eventGetterHash };
};

let cdpRegistry = {};

export const registerCdpEvents = eventGetterHash => {
  cdpRegistry = { ...cdpRegistry, ...eventGetterHash };
};

// TODO: hide event service from maker api
export default class EventService extends LocalService {
  /**
   * @param {string} name
   */
  constructor(name = 'event') {
    super(name);

    this.hotEmitters = [];

    const makerPipeline = this.createPipeline();
    this.makerPipeline = () => makerPipeline;

    const cdpPipeline = this.createPipeline();
    this.cdpPipeline = () => cdpPipeline;

    this.ping = this.ping.bind(this);
  }

  // called on every new block from the web3service
  ping(block) {
    for (let emitter of this.hotEmitters) {
      emitter.ping(block);
    }
  }

  pollAll() {
    const makerPipeline = this.makerPipeline();
    this.createPolls(makerRegistry, makerPipeline);

    const cdpPipeline = this.cdpPipeline();
    this.createPolls(cdpRegistry, cdpPipeline);
  }

  createPolls(eventPayloadRegistry, pipeline) {
    for (let [event, payloadSchema] of Object.entries(eventPayloadRegistry)) {
      this.createPoll(event, payloadSchema, pipeline);
    }
  }

  async createPoll(event, payloadSchema, pipeline) {
    // const [service] = event;
    // if (!availableService(service)) {
    //     throw new Error(`no service called ${service}`);
    // }
    const selector = this.createPayloadSelector(payloadSchema);
    const memoizedEmitter = await this.createMemoizedEmitter({
      type: event,
      pull: selector,
      pipe: pipeline
    });
    this.hotEmitters.push(memoizedEmitter);
  }

  createPayloadSelector(payloadSchema) {
    return async () => {
      const payload = {};
      for (let [name, getter] of Object.entries(payloadSchema)) {
        payload[name] = await getter();
      }
      return payload;
    };
  }

  createPipeline({
    emitter = new EventEmitter({
      wildcard: true,
      delimiter: '/'
    }),
    indexer = eventIndexer()
  } = {}) {
    return {
      pump(event, payload, block) {
        const eventObj = {
          block,
          payload,
          type: event,
          index: indexer()
        };
        emitter.emit(event, eventObj);
      },
      on(event, listener) {
        emitter.on(event, listener);
      }
    };
  }

  async createMemoizedEmitter({ type, pull, pipe }) {
    let curr = await pull();
    return {
      async ping(block) {
        const next = await pull();
        if (!isEqual(curr, next)) {
          pipe.pump(type, next, block);
          curr = next;
        }
      }
    };
  }
}
