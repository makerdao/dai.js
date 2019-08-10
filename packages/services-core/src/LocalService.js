import ServiceType from './ServiceType';
import ServiceBase from './ServiceBase';

/**
 *
 */
class LocalService extends ServiceBase {
  /**
   * @param {string} name
   * @param {string[]} dependencies
   */
  constructor(name, dependencies = []) {
    super(ServiceType.LOCAL, name, dependencies);
  }
}

export default LocalService;
