import LocalService from '../core/LocalService';

const _ = () => {};

export default class NullEventService extends LocalService {
  /**
   * @param {string} name
   */
  constructor(name = 'event') {
    super(name);
  }

  on() {}
  emit() {}
  ping() {}
  removeListener() {}
  registerPollEvents() {}
  disposeEmitter() {}
  activatePollsForAllEmitters() {}
  createEmitter() {
    return {
      emit: _,
      on: _,
      removeListener: _,
      registerPollEvents: _,
      activatePolls: _,
      activatePoll: _,
      getPolls: _,
      dispose: _
    };
  }
}
