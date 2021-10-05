import {
  EMERGENCY_SHUTDOWN_ACTIVE,
  EMERGENCY_SHUTDOWN_TIME
} from './_constants';

export const endLive = {
  generate: () => ({
    id: 'MCD_END.live',
    contract: 'MCD_END',
    call: ['live()(uint256)']
  }),
  returns: [[EMERGENCY_SHUTDOWN_ACTIVE, val => val.eq(0)]]
};

export const endWhen = {
  generate: () => ({
    id: 'MCD_END.When',
    contract: 'MCD_END',
    call: ['when()(uint256)']
  }),
  returns: [[EMERGENCY_SHUTDOWN_TIME, val => new Date(val.toNumber() * 1000)]]
};

export default {
  endLive,
  endWhen
};
