import ServiceManager from '../../../src/core/ServiceManager';
import BunyanLogger from '../../../src/utils/loggers/BunyanLogger';

test('should correctly log info messages and service lifecycle events', () => {
  const log = new BunyanLogger(),
    svc = new ServiceManager('MyService', ['log'])
      .inject('log', log)
      .createService();

  //@todo: find a way to properly test log output
  //log.info('Test 1');
  //log.info({ hello: 'Test 2' }, 'Text is %hello');
  //log.serviceLogger(svc);

  svc.manager().initialize();
});
