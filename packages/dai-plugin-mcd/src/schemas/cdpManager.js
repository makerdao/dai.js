import { VAULT_URN, VAULT_ILK } from './constants';
import { bytesToString } from '../utils';

export const cdpManagerUrns = {
  generate: id => ({
    id: `CDP_MANAGER.urns(${id})`,
    contractName: 'CDP_MANAGER',
    call: ['urns(uint256)(address)', parseInt(id)]
  }),
  returns: [VAULT_URN]
};

export const cdpManagerIlks = {
  generate: id => ({
    id: `CDP_MANAGER.ilks(${id})`,
    contractName: 'CDP_MANAGER',
    call: ['ilks(uint256)(bytes32)', parseInt(id)]
  }),
  returns: [[VAULT_ILK, bytesToString]]
};

export default {
  cdpManagerUrns,
  cdpManagerIlks
};
