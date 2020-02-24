import { bytesToString } from '../utils';
import BigNumber from 'bignumber.js';

import {
  VAULT_ADDRESS,
  VAULT_TYPE,
  VAULTS_CREATED,
  VAULT_OWNER
} from './_constants';
import { validateVaultId, validateVaultTypeResult } from './_validators';

export const cdpManagerUrns = {
  generate: id => ({
    id: `CDP_MANAGER.urns(${id})`,
    contract: 'CDP_MANAGER',
    call: ['urns(uint256)(address)', parseInt(id)]
  }),
  returns: [VAULT_ADDRESS]
};

export const cdpManagerIlks = {
  generate: id => ({
    id: `CDP_MANAGER.ilks(${id})`,
    contract: 'CDP_MANAGER',
    call: ['ilks(uint256)(bytes32)', parseInt(id)]
  }),
  validate: {
    args: validateVaultId,
    [VAULT_TYPE]: validateVaultTypeResult
  },
  returns: [[VAULT_TYPE, bytesToString]]
};

export const cdpManagerCdpi = {
  generate: () => ({
    id: 'CDP_MANAGER.cdpi',
    contract: 'CDP_MANAGER',
    call: ['cdpi()(uint256)']
  }),
  returns: [[VAULTS_CREATED, v => BigNumber(v)]]
};

export const cdpManagerOwner = {
  generate: id => ({
    id: `CDP_MANAGER.owner(${id})`,
    contract: 'CDP_MANAGER',
    call: ['owns(uint256)(address)', id]
  }),
  returns: [[VAULT_OWNER]]
};

export default {
  cdpManagerUrns,
  cdpManagerIlks,
  cdpManagerCdpi,
  cdpManagerOwner
};
