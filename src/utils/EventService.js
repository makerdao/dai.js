import LocalService from '../core/LocalService';
import { eventIndexer } from './index';
import isEqual from 'lodash.isequal';
import EventEmitterObj from 'eventemitter2';

const { EventEmitter2 } = EventEmitterObj;

export default class EventService extends LocalService {
  /**
   * @param {string} name
   */
  constructor(name = 'event') {
    super(name);

    this.pipelines = {};

    // this is our default pipeline, it will be attached to our maker object
    this.createPipeline({ name: 'default' });

    // i want to see that this new pipline is assigned to this.pipelines.default

    this.ping = this.ping.bind(this);
  }

  registerPollEvents(eventGetterHash, pipeline = this.pipelines.default) {
    pipeline.registerPollEvents(eventGetterHash);
  }

  // add a listener to our default pipeline
  on(event, listener, pipeline = this.pipelines.default) {
    pipeline.on(event, listener);
  }

  // push an event through our default pipeline
  pump(event, payload, block, pipeline = this.pipelines.default) {
    pipeline.pump(event, payload, block);
  }

  ping(block) {
    for (let pipeline of Object.values(this.pipelines)) {
      this._pingEmitters(pipeline, block);
    }
  }

  _pingEmitters(pipeline, block) {
    for (let emitter of pipeline.getHotEmitters()) {
      emitter.ping(block);
    }
  }

  startPollingAllRegisteredEvents(pipeline = this.pipelines.default) {
    pipeline.startPollingAllRegisteredEvents();
  }

  createPipeline({
    server = new EventEmitter2({
      wildcard: true,
      delimiter: '/'
    }),
    indexer = eventIndexer(),
    name = 'bob'
  } = {}) {
    // I'd rather assign the default pipeline directly in the constructor
    const newPipeline = this._createPipeline({ server, indexer, name });
    this.pipelines[name] = newPipeline;
    return newPipeline;
  }

  _createPipeline({ server, indexer } = {}) {
    let pollEventRegistry = {};
    const hotEmitters = [];

    // multiple emits because we keep calling startPollingAllRegisteredEvents
    return {
      pump(event, payload, block) {
        const eventObj = {
          block,
          payload,
          type: event,
          index: indexer()
        };
        server.emit(event, eventObj);
      },
      on(event, listener) {
        // const [service] = event;
        // if (!availableService(service)) {
        //     throw new Error(`no service called ${service}`);
        // }
        server.on(event, listener);
      },
      registerPollEvents(eventGetterHash) {
        pollEventRegistry = { ...pollEventRegistry, ...eventGetterHash };
      },
      getPollEventRegistry() {
        return pollEventRegistry;
      },
      getHotEmitters() {
        return hotEmitters;
      },
      // this doesn't return anything, maybe a vanilla promise is better
      async startPollingAllRegisteredEvents() {
        const eventPayloadRegistry = this.getPollEventRegistry();
        for (let [type, payloadSchema] of Object.entries(
          eventPayloadRegistry
        )) {
          const payloadSelector = EventService._createPayloadSelector(
            payloadSchema
          );
          const memoizedEmitter = await EventService._createMemoizedEmitter({
            type,
            pull: payloadSelector,
            pipe: this
          });
          hotEmitters.push(memoizedEmitter);
          // this.createPoll(type, payloadSchema, pipeline);
        }
      }
    };
  }

  // async createPoll(type, payloadSchema, pipeline) {
  //     const payloadSelector = this._createPayloadSelector(payloadSchema);
  //     const memoizedEmitter = await this._createMemoizedEmitter({
  //         type,
  //         pull: payloadSelector,
  //         pipe: pipeline
  //     });
  //     // pipe these together
  //     this.hotEmitters.push(memoizedEmitter);
  // }

  // could be optimized with promise.all, might be premature
  static _createPayloadSelector(payloadSchema) {
    return async () => {
      const payload = {};
      for (let [name, getter] of Object.entries(payloadSchema)) {
        payload[name] = await getter();
      }
      return payload;
    };
  }

  static async _createMemoizedEmitter({ type, pull, pipe }) {
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
