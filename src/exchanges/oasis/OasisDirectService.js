import PrivateService from '../../core/PrivateService';

export default class OasisDirectService extends PrivateService {
  constructor(name = 'oasisDirect') {
    super(name, ['proxy']);
  }
}
