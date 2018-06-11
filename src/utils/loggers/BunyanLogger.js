import ServiceManager from '../../core/ServiceManager';
import PrivateService from '../../core/PrivateService';
import bunyan from 'bunyan';

/**
 * @returns {string}
 * @private
 */
function _guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return (
    s4() +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    '-' +
    s4() +
    s4() +
    s4()
  );
}

function _appendState(service) {
  return args => {
    if (typeof args[0] === 'object') {
      args[0].state = service.manager().state();
    } else {
      args = [{ state: service.manager().state() }].concat(args);
    }

    return args;
  };
}

export default class BunyanLogger extends PrivateService {
  /**
   * @param {string} name
   */
  constructor(name = 'log') {
    super(name);

    this._logger = bunyan.createLogger({
      name: 'makerdao',
      level: 'debug',
      serializers: { err: bunyan.stdSerializers.err },
      client: _guid()
    });
  }

  serviceLogger(service, name = null) {
    if (!ServiceManager.isValidService(service)) {
      throw new Error('Invalid service object');
    }

    const log = this._logger.child({ svc: name || service.manager().name() }),
      append = _appendState(service),
      wrapper = {
        trace: (...args) => log.trace.apply(log, append(args)),
        debug: (...args) => log.debug.apply(log, append(args)),
        info: (...args) => log.info.apply(log, append(args)),
        warn: (...args) => log.warn.apply(log, append(args)),
        error: (...args) => log.error.apply(log, append(args)),
        fatal: (...args) => log.fatal.apply(log, append(args))
      };

    service.manager().onStateChanged((from, to) => {
      wrapper.debug({ transition: { from, to } }, 'State changed.');
    });

    return wrapper;
  }

  trace(...args) {
    this._logger.trace.apply(this._logger, args);
  }

  debug(...args) {
    this._logger.debug.apply(this._logger, args);
  }

  info(...args) {
    this._logger.info.apply(this._logger, args);
  }

  warn(...args) {
    this._logger.warn.apply(this._logger, args);
  }

  error(...args) {
    this._logger.error.apply(this._logger, args);
  }

  fatal(...args) {
    this._logger.fatal.apply(this._logger, args);
  }

  connect() {}

  authenticate() {}
}
