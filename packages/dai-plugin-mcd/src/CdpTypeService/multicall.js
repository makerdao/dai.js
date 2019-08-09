import { ServiceRoles } from '../constants';
import { toHex } from '../utils/ethereum';

export function createSchema(cdpTypeService) {
  const systemData = cdpTypeService.get(ServiceRoles.SYSTEM_DATA);
  const contracts = systemData.get('smartContract');
  return cdpTypeService.cdpTypes
    .map(type => createSchemaForType(type, contracts, systemData))
    .flat()
    .concat({
      target: contracts.getContractAddress('MCD_SPOT'),
      call: ['par()(uint256)'],
      returns: [['system.par']]
    });
}

const createSchemaForType = ({ ilk, currency }, contracts, systemData) => [
  {
    target: contracts.getContractAddress('MCD_JUG'),
    call: ['ilks(bytes32)(uint256,uint48)', toHex(ilk)],
    returns: [[`ilk.${ilk}.jug.duty`], [`ilk.${ilk}.jug.rho`]]
  },
  {
    target: contracts.getContractAddress('MCD_VAT'),
    call: [
      'ilks(bytes32)(uint256,uint256,uint256,uint256,uint256)',
      toHex(ilk)
    ],
    returns: [
      [`ilk.${ilk}.vat.Art`],
      [`ilk.${ilk}.vat.rate`],
      [`ilk.${ilk}.vat.spot`],
      [`ilk.${ilk}.vat.line`],
      []
    ]
  },
  {
    target: contracts.getContractAddress('MCD_SPOT'),
    call: ['ilks(bytes32)(address,uint256)', toHex(ilk)],
    returns: [[`ilk.${ilk}.spot.pip`], [`ilk.${ilk}.spot.mat`]]
  },
  {
    target: contracts.getContractAddress('MCD_CAT'),
    call: ['ilks(bytes32)(address,uint256,uint256)', toHex(ilk)],
    returns: [
      [`ilk.${ilk}.cat.flip`],
      [`ilk.${ilk}.cat.chop`],
      [`ilk.${ilk}.cat.lump`]
    ]
  },
  {
    target: contracts.getContractAddress(currency.symbol),
    call: ['balanceOf(address)(uint256)', systemData.adapterAddress(ilk)],
    returns: [[`ilk.${ilk}.adapterBalance`]]
  }
];
