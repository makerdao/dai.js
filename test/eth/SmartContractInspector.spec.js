import SmartContractService from '../../src/eth/SmartContractService';
import SmartContractInspector from '../../src/eth/SmartContractInspector';
import contracts from '../../contracts/contracts';
import ContractWatcher from '../../src/eth/inspector/ContractWatcher';
import PropertyWatcher from '../../src/eth/inspector/PropertyWatcher';
import MethodWatcher from '../../src/eth/inspector/MethodWatcher';

function buildInspector() {
  const service = SmartContractService.buildTestService(null, true),
    inspector = new SmartContractInspector(service);

  return service.manager().authenticate().then(() => inspector);
}

test('should register contract watchers', done => {
  buildInspector().then(inspector => {
    inspector.watch(contracts.SAI_TUB);
    expect(inspector._watchers._contracts[contracts.SAI_TUB]).toBeInstanceOf(ContractWatcher);
    expect(inspector._watchers._contracts[contracts.SAI_TUB].id()).toBe(contracts.SAI_TUB);

    inspector.watch(contracts.SAI_PIP.toLowerCase());
    expect(inspector._watchers._contracts[contracts.SAI_PIP]).toBeInstanceOf(ContractWatcher);
    expect(inspector._watchers._contracts[contracts.SAI_PIP].id()).toBe(contracts.SAI_PIP);

    expect(() => inspector.watch('NOT_A_CONTRACT'))
      .toThrow('Cannot find contract: \'NOT_A_CONTRACT\'');

    expect(() => inspector.watch(['NOT_A_CONTRACT']))
      .toThrow('Expected contract name string, got \'object\'');

    done();
  });
});

test('should register property watchers', done => {
  buildInspector().then(inspector => {
    inspector.watch(contracts.SAI_TUB, '_chi');
    expect(inspector._watchers[contracts.SAI_TUB]['SAI_TUB._chi']).toBeInstanceOf(PropertyWatcher);

    expect(() => inspector.watch(contracts.SAI_TUB, '123InvalidPropertyName'))
      .toThrow('Illegal watch expression for SAI_TUB: \'123InvalidPropertyName\'');

    done();
  });
});

test('should register method watchers', done => {
  buildInspector().then(inspector => {
    inspector.watch(contracts.SAI_TUB, ['tap']);
    expect(inspector._watchers[contracts.SAI_TUB]['SAI_TUB.tap()']).toBeInstanceOf(MethodWatcher);

    inspector.watch(contracts.SAI_TUB, ['cup', 1]);
    expect(inspector._watchers[contracts.SAI_TUB]['SAI_TUB.cup(1)']).toBeInstanceOf(MethodWatcher);

    inspector.watch(contracts.SAI_TUB, ['cup', 1, 'test']);
    expect(inspector._watchers[contracts.SAI_TUB]['SAI_TUB.cup(1,test)']).toBeInstanceOf(MethodWatcher);

    done();
  });
});

test('should call watchers recursively', done => {
  buildInspector().then(inspector => {
    inspector.watch(contracts.SAI_TUB);
    inspector.watch(contracts.SAI_TUB, 'pit');
    inspector.watch(contracts.SAI_TUB, 'pip');

    inspector.inspect().then(map => {
      expect(Object.keys(map)).toEqual(['SAI_TUB', 'SAI_TUB.pit', 'SAI_TUB.pip']);
      done();
    });
  });
});