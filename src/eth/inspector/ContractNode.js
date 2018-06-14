const contractInfo = {
  SAI_PIP:
    'Collateral token price feed contract (WETH/USD). Implements DSValue.',
  SAI_PEP:
    'Governance token price feed contract (MKR/USD). Implements DSValue.',
  SAI_PIT: 'Token burner contract.',
  SAI_SIN:
    'Anticoin token contract. Tokens are created when the system takes on debt. Implements DSToken.',
  SAI_DAD:
    'DSGuard contract used for internal contract-contract permissions, allowing e.g. ' +
    'SAI_TUB to mint and burn DAI. It is the authority of SAI_TUB, SAI_TAP, SAI_SIN, DAI, and MKR.',
  SAI_MOM:
    'Administration contract for setting risk parameters: debt ceiling, liquidation ratio, fees, ...',
  SAI_VOX: 'Target price feed contract.',
  SAI_TUB: 'CDP record store contract.',
  SAI_TAP: 'Liquidation mechanism contract.',
  SAI_TOP: 'Global settlement contract.',
  MAKER_OTC:
    'Oasis OTC contract for buying and selling DAI and any other token pair listed on OasisDEX.',
  ZERO_EX_EXCHANGE: 'ZeroEx exchange contract.',
  DAI: 'Single Collateral DAI stablecoin contract. Implements DSToken.',
  MKR:
    'Maker governance token contract. Used for voting and payment of fees. Implements DSToken.',
  WETH: 'Wrapped Ether token contract (WETH9). Implements ERC20.',
  PETH:
    'Pooled Ether token contract used as abstracted collateral claim. Implements DSToken.'
};

export default class ContractNode {
  constructor(name, address, signer) {
    this._name = name;
    this._address = address;
    this._signer = signer;
    this._children = {};
  }

  addChild(id) {
    this._children[id] = true;
  }

  getChildren() {
    return Object.keys(this._children);
  }

  getInfo() {
    return {
      type: 'contract',
      name: this._name,
      address: this._address,
      signer: this._signer,
      info:
        contractInfo[this._name] ||
        'No additional info available for this contract.'
    };
  }
}
