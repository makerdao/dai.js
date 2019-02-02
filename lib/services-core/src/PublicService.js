import ServiceType from './ServiceType';
import ServiceBase from './ServiceBase';

/**
 *
 */
class PublicService extends ServiceBase {
  /**
   * @param {string} name
   * @param {string[]} dependencies
   */
  constructor(name, dependencies = []) {
    super(ServiceType.PUBLIC, name, dependencies);
  }
}

export default PublicService;
