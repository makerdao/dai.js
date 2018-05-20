const propertiesInfo = {
  'SAI_TUB.sai': 'Stablecoin',
  'SAI_TUB.sin': 'Debt (negative sai)',
  'SAI_TUB.skr': 'Abstracted collateral',
  'SAI_TUB.gem': 'Underlying collateral',
  'SAI_TUB.gov': 'Governance token',
  'SAI_TUB.vox': 'Target price feed',
  'SAI_TUB.pip': 'Reference price feed',
  'SAI_TUB.pep': 'Governance price feed',
  'SAI_TUB.tap': 'Liquidator',
  'SAI_TUB.pit': 'Governance vault account',
  'SAI_TUB.axe': 'Liquidation penalty',
  'SAI_TUB.cap': 'Debt ceiling',
  'SAI_TUB.mat': 'Liquidation ratio',
  'SAI_TUB.tax': 'Stability fee',
  'SAI_TUB.fee': 'Governance fee',
  'SAI_TUB.gap': 'Join-Exit Spread',
  'SAI_TUB.off': 'Cage flag',
  'SAI_TUB.out': 'Post cage exit',
  'SAI_TUB.fit': 'REF per SKR (just before settlement)',
  'SAI_TUB.rho': 'Time of last drip',
  'SAI_TUB._chi': 'Accumulated Tax Rates',
  'SAI_TUB._rhi': 'Accumulated Tax + Fee Rates',
  'SAI_TUB.rum': 'Total normalised debt',
  'SAI_TUB.cupi': 'CDP ID counter.',
};

export default class PropertyNode {

  constructor(name, contract, id, value) {
    this._name = name;
    this._contract = contract;
    this._id = id;
    this._rawValue = value;
  }

  getInfo() {
    return {
      type: 'property',
      contract: this._contract,
      name: this._name,
      value: this._rawValue.toString(),
      info: propertiesInfo[this._id] || 'No additional info available.'
    };
  }
}