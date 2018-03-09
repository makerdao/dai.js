import ServiceManager from '../../services/ServiceManager';
import BunyanService from './BunyanService';

test('', () => {

  const log = new BunyanService(),
    svc = new ServiceManager('MyService', ['log']).inject('log', log).createService();

  log.info('Test 1');
  log.info({ heyo: 'Test 2' }, 'Text is %heyo');
  log.serviceLogger(svc);

  svc.manager().initialize();

});