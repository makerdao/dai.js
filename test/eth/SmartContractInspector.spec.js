import { buildTestSmartContractService } from '../helpers/serviceBuilders';
import SmartContractInspector from '../../src/eth/SmartContractInspector';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import ContractWatcher from '../../src/eth/inspector/ContractWatcher';
import PropertyWatcher from '../../src/eth/inspector/PropertyWatcher';
import MethodWatcher from '../../src/eth/inspector/MethodWatcher';
import { numberToBytes32 } from '../../src/utils/conversion';

let service = null;

function buildInspector() {
  service = buildTestSmartContractService(null, true);
  return service
    .manager()
    .authenticate()
    .then(() => new SmartContractInspector(service));
}

test('should register contract watchers', done => {
  buildInspector().then(inspector => {
    inspector.watch(contracts.SAI_TUB);
    expect(inspector._watchers._contracts[contracts.SAI_TUB]).toBeInstanceOf(
      ContractWatcher
    );
    expect(inspector._watchers._contracts[contracts.SAI_TUB].id()).toBe(
      contracts.SAI_TUB
    );

    inspector.watch(contracts.SAI_PIP.toLowerCase());
    expect(inspector._watchers._contracts[contracts.SAI_PIP]).toBeInstanceOf(
      ContractWatcher
    );
    expect(inspector._watchers._contracts[contracts.SAI_PIP].id()).toBe(
      contracts.SAI_PIP
    );

    expect(() => inspector.watch('NOT_A_CONTRACT')).toThrow(
      "Cannot find contract: 'NOT_A_CONTRACT'"
    );

    expect(() => inspector.watch(['NOT_A_CONTRACT'])).toThrow(
      "Expected contract name string, got 'object'"
    );

    done();
  });
});

test('should register property watchers', done => {
  buildInspector().then(inspector => {
    inspector.watch(contracts.SAI_TUB, '_chi');
    expect(
      inspector._watchers[contracts.SAI_TUB]['SAI_TUB._chi']
    ).toBeInstanceOf(PropertyWatcher);

    expect(() =>
      inspector.watch(contracts.SAI_TUB, '123InvalidPropertyName')
    ).toThrow("Illegal watch expression for SAI_TUB: '123InvalidPropertyName'");

    done();
  });
});

test('should register method watchers', done => {
  buildInspector().then(inspector => {
    inspector.watch(contracts.SAI_TUB, ['tap']);
    expect(
      inspector._watchers[contracts.SAI_TUB]['SAI_TUB.tap()']
    ).toBeInstanceOf(MethodWatcher);

    inspector.watch(contracts.SAI_TUB, ['cup', 1]);
    expect(
      inspector._watchers[contracts.SAI_TUB]['SAI_TUB.cup(1)']
    ).toBeInstanceOf(MethodWatcher);

    inspector.watch(contracts.SAI_TUB, ['cup', 1, 'test']);
    expect(
      inspector._watchers[contracts.SAI_TUB]['SAI_TUB.cup(1,test)']
    ).toBeInstanceOf(MethodWatcher);

    done();
  });
});

test('should generate nodes for watched contracts and their properties', done => {
  buildInspector().then(inspector => {
    inspector.watch(contracts.SAI_TUB);
    inspector.watch(contracts.SAI_TUB, ['cups', numberToBytes32(1)]);
    inspector.watch(tokens.MKR);

    inspector.inspect().then(map => {
      expect(map[contracts.SAI_TUB].getInfo()).toEqual({
        type: 'contract',
        name: 'SAI_TUB',
        address: '0XE82CE3D6BF40F2F9414C8D01A35E3D9EB16A1761',
        signer: '0X16FB96A5FA0427AF0C8F7CF1EB4870231C8154B6',
        info: 'CDP record store contract.'
      });

      expect(map[contracts.SAI_TUB + '.axe']).toBeDefined();

      expect(map[tokens.MKR].getInfo()).toEqual({
        type: 'contract',
        name: 'MKR',
        address: '0X1C3AC7216250EDC5B9DAA5598DA0579688B9DBD5',
        signer: '0X16FB96A5FA0427AF0C8F7CF1EB4870231C8154B6',
        info:
          'Maker governance token contract. Used for voting and payment of fees. Implements DSToken.'
      });

      expect(map[tokens.MKR + '.totalSupply']).toBeDefined();

      expect(map[contracts.SAI_TUB + '.axe'].getInfo()).toEqual({
        type: 'property',
        name: 'axe',
        contract: 'SAI_TUB',
        value: '1130000000000000000000000000',
        isError: false,
        info: 'Liquidation penalty'
      });

      //console.log(Object.keys(map).map(k => [map[k].getInfo(), map[k].children]));

      done();
    });
  });
});
