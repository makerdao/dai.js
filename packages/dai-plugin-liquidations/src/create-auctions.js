// import Maker from '@makerdao/dai';
// import { McdPlugin } from '@makerdao/dai-plugin-mcd';
import Maker from '../../dai/src';
import { McdPlugin, ETH, DAI, LINK } from '../../dai-plugin-mcd/src';
import { mineBlocks } from '../../test-helpers/src';

let maker;
let web3;
// let kprAddress = '';

const dogAddress = '0xc1F5856c066cfdD59D405DfCf1e77F667537bc99'; // setup dog contract address
// const privateKey =
//   '474beb999fed1b3af2ea048f963833c686a0fba05f5724cb6417cf3b8ee9697e'; // insert wallet private key
let linkBalance;
const ilk =
  '0x4c494e4b2d410000000000000000000000000000000000000000000000000000';
let urns = [];

const kovanAddresses = {
  AAVE: '0x12F30DFCdCB82B7AAE11513fFcc290EbbdF97124',
  BAL: '0xFc5f5e7Ff8587BcB9b560fED552e86B8472A6AD5',
  BAT: '0x7581e647b7b5d522B198EF44F51E1121b3D837B0',
  CDP_MANAGER: '0xd97fd1B5867cC71AfA32A0c36d38102241856Cde',
  COMP: '0xe1131FBFF225FfC0ebdc4233852fdC415e4d2B6b',
  DEPLOYER: '0x16Fb96a5fa0427Af0C8F7cF1eB4870231c8154B6',
  DGD: '0xdB8848ea69cCE3f7f41949D274899641e558cDf4',
  DSR_MANAGER: '0x17c7D82597A3a07AEd1FDF1db560B7502AeB3ADf',
  ETH: '0x7ba25F791FA76C3ef40AC98ed42634a8bC24c238',
  FAUCET: '0x50289fDAf1C8FE16E14fc28642a77C1A70943245',
  FLIPPER_MOM: '0x23b8aD8B5B26351fD2C304aE23c8679Da03B9155',
  GET_CDPS: '0x55a191069a8ACE1589c9d44E8dbB6D1051C76e20',
  GNT: '0xd324BC539B85e6DFe08005c4D261d0ff22b0A34C',
  GUSD: '0x15544edA8129971aF725183f9c918f4613667bb8',
  ILK_REGISTRY: '0x5e5baAcFFefa9958B64894141bE27d8f2a9B92e6',
  KNC: '0x2B0B998110C0038336a8d5609c4E3A0AC35Af0f4',
  LINK: '0xa26B57185e56375dd20225aDcEbd00d7e82681e4',
  LRC: '0xDBb349cbFB22540B90995298CE3909Dd4Fa2C75d',
  MANA: '0x15ed0b56FC19773832011Da89118c3dd41072091',
  MCD_ADM: '0x795f65578081AA750d874E1a3A6c434D1D98E118',
  MCD_CAT: '0xa64D95634d839445283f71137f9CeD3f1405aad5',
  MCD_CLIP_CALC_ETH_B: '0xfFE1912a78AA9E556cC80a4F3822551F5bB1A119',
  MCD_CLIP_CALC_ETH_C: '0x49058F4F6c8C3E1b75aeD7AA45e06c439b9429f0',
  MCD_CLIP_CALC_LINK_A: '0x391e0c5B8bc5e2b7ABC12d330523C1D3e3F86ECE',
  MCD_CLIP_CALC_YFI_A: '0x00727147Df379B69BB7bbf84C8c95e4eaf3e2c96',
  MCD_CLIP_ETH_B: '0xA7fD71f86a79B9595Bc74dB12226E7298097581B',
  MCD_CLIP_ETH_C: '0x76DECA04eA3bd6bCF2F7220aa849CC80ab1A4eef',
  MCD_CLIP_LINK_A: '0xc84b50Ea1cB3f964eFE51961140057f7E69b09c1',
  MCD_CLIP_YFI_A: '0x9c0ff10dB728ebf5DA896DEDC782bA58F9dF3D57',
  MCD_DAI: '0x970b3b28EBD466f2eC181630D4c3C93DfE280448',
  MCD_DEPLOY: '0xDC901A38a2Ec3283556F039b115423049517B50c',
  MCD_DOG: '0xc1F5856c066cfdD59D405DfCf1e77F667537bc99',
  MCD_END: '0x3F35940dD9f42F7560fa08F506c81d99fed870a7',
  MCD_ESM: '0x4A504460C1ea6c1945D07619B546e4629fd2A5dB',
  MCD_FLAP: '0xd34835EaE60dA418abfc538B7b55332fC5F10340',
  MCD_FLIP_AAVE_A: '0xec1D14AD3102A9867ab1CdFAB5Bd655a82c1c5EC',
  MCD_FLIP_BAL_A: '0x1caE632Baa08502Bc3693eCc769d04155b770501',
  MCD_FLIP_BAT_A: '0x0CBb0ed2946393cE8a8f2EEC7aBaFD58c49D9d89',
  MCD_FLIP_COMP_A: '0x25c15b311BB071cbf0571388D88B77B8b8fb3b0B',
  MCD_FLIP_DGD_A: '0x26b3ea110949E4760945D964F60c87B4BaAE96a5',
  MCD_FLIP_ETH_A: '0xbacD4966540aAF7223CC9DC39a3ea1E4322Aba78',
  MCD_FLIP_GNT_A: '0x616099C5744620518Da2860DB2e388Ed8902001D',
  MCD_FLIP_GUSD_A: '0x6a85eeD807Ae98ddF6c76a0d3D772C5B8F9D00Dc',
  MCD_FLIP_KNC_A: '0xee899F7FB0B8f87c25B2F300d8E20Ee4a2033ae7',
  MCD_FLIP_LRC_A: '0xf510F1c8DE8ED9D4e79014d0475a9f847CeF3D7a',
  MCD_FLIP_MANA_A: '0x55A3b86bB4f9639E903531e45b7f7069a74ff474',
  MCD_FLIP_OMG_A: '0x50691F81d5396747B52c28CB7a4c2d0090F27d77',
  MCD_FLIP_PAXUSD_A: '0xf24606afCF106a08a95696b02fF665af2cb9C8c0',
  MCD_FLIP_RENBTC_A: '0xab719EF588d87c82fab5d73082D8598543368e7F',
  MCD_FLIP_REP_A: '0x2b5b026539B6AeF8635D7e178876778ef551b233',
  MCD_FLIP_TUSD_A: '0x8D83c1aC46cfEf8307441087B33CfF0Dc83fCa60',
  MCD_FLIP_UNI_A: '0x23ff1514dCB93469Ee9bA534DeCB49a02F2B1FE4',
  MCD_FLIP_USDC_A: '0xd464c5f218f16526d04d8A5FDFfAd3c88c8A2490',
  MCD_FLIP_USDC_B: '0x99D071e52D023e1AA8020d493D3dAB79A9dd12B8',
  MCD_FLIP_USDT_A: '0xC945E447990954Ef8801ab472766d645B9f3B3b6',
  MCD_FLIP_WBTC_A: '0xa81bF11C9AA84c3AA4B6e8D083Bc99F912866f5b',
  MCD_FLIP_ZRX_A: '0xdd2bAC60Ee6Fd4Ae344Fc46A56b3B30803Ff8ebD',
  MCD_FLOP: '0xBfd57220780aB21112008C2296C09B3a10d7E2ad',
  MCD_GOV: '0x1c3ac7216250eDC5B9DaA5598DA0579688b9dbD5',
  MCD_GOV_ACTIONS: '0x35D1BC6e287f13AA10B3d44489f5959B1063C995',
  MCD_IAM_AUTO_LINE: '0xAe2f82b48f2C12bA5532879C4A718f8aAbF2f8E6',
  MCD_IOU: '0xF5303EF974273A97bA92436E39C304618Ffaa5c0',
  MCD_JOIN_AAVE_A: '0xe46C4EB99d5EB00DBeFE6Eb0c2BD34F3EB2899CF',
  MCD_JOIN_BAL_A: '0x0c7126197f991C21Fc8Cfb8534e1Bf6d07740D79',
  MCD_JOIN_BAT_A: '0x689E9DC3214aC88F312FdD148684BF199cCF596c',
  MCD_JOIN_COMP_A: '0x2cC9A419Cec33E7906c6a37988e861eA1bddd1C2',
  MCD_JOIN_DAI: '0xe53793CA0F1a3991D6bfBc5929f89A9eDe65da44',
  MCD_JOIN_DGD_A: '0x2A3a2f87403d675748eb11B6fCe92a16A0084eb6',
  MCD_JOIN_ETH_A: '0xEB9d9336b4A89260bC4B94ee6a34e2faF46B0CA5',
  MCD_JOIN_ETH_B: '0x1fD87e7ddF2A2f22ac5fb8F617A44214f17B883c',
  MCD_JOIN_ETH_C: '0x2D1E17cD66E68173d2a6DCaCcf640ce613D75983',
  MCD_JOIN_GNT_A: '0xa805669Da5d6C3851f383acc03a9a5fC45671C25',
  MCD_JOIN_GUSD_A: '0x99F8dc423f25f8Ad1b797E40412A93E529A7F837',
  MCD_JOIN_KNC_A: '0x296D06095288397615E024AfF4FeCc0C57edF70B',
  MCD_JOIN_LINK_A: '0xf95A6b6740f8FCbb25EB49BC0176C2b4581fdb73',
  MCD_JOIN_LRC_A: '0x392e4fF172E6d88C3375De218F6e7e2fA75D3C82',
  MCD_JOIN_MANA_A: '0x19BDC4b950285a608E50F3b5E7DF154FacBda861',
  MCD_JOIN_OMG_A: '0x23c9aafE0d1968EaC6d9F1edb9FA831641783FEd',
  MCD_JOIN_PAXUSD_A: '0x4165855523c21DF91814040f8f01f2f33905139d',
  MCD_JOIN_RENBTC_A: '0xAE130aEcdF43abbEfdBb97D87bA8Ea38f922CcD8',
  MCD_JOIN_REP_A: '0x8a339ADa3b96d6139BBDCe3Bd0375725Fc411133',
  MCD_JOIN_TUSD_A: '0x378100E78ccEf442F38f1FcFdc4B4352884bcb67',
  MCD_JOIN_UNI_A: '0x25f3850107175351B664b73d9F429DdFDF0A42ad',
  MCD_JOIN_USDC_A: '0x0E69131732c7700d5d598350504ba885D677CCA8',
  MCD_JOIN_USDC_B: '0xE425CA42d0CB22D0D82366f6B811d559cff437B4',
  MCD_JOIN_USDT_A: '0x7861fEf0437924c0C5E52D617312b058477dB810',
  MCD_JOIN_WBTC_A: '0x565e5E6d6C43Aff09A5b3C2b33d710d9c2c63e06',
  MCD_JOIN_YFI_A: '0x93F8E68D3C60678A9fD4D71254C455F852bf93B5',
  MCD_JOIN_ZRX_A: '0xAE3AFb153a36d3E48D4CbC2D0A83EBF9fD2f89Ca',
  MCD_JUG: '0x6D6e3B9B602a0a37c820F2383A1DD0EC02B5196d',
  MCD_PAUSE: '0xBFD5ccf89494B6A4A98c525f4E97f57C44f32CEB',
  MCD_PAUSE_PROXY: '0x48aDe16916F15390b02680033b0282ebB8408105',
  MCD_POT: '0xb379BdC949F09e0E1c866785D1896B763E1387b0',
  MCD_SPOT: '0x31880D3A1E5cbF402b6F9840e7aDC6E7962b771B',
  MCD_VAT: '0x2d7f58ABB321ee1c63e8aBFF89A7CC100E7EEd01',
  MCD_VOW: '0xd6D7C74729bB83c35138E54b8d5530ea96920c92',
  MULTICALL: '0x5AE5677589cf9992290918CcD1828dcBD73D842c',
  OMG: '0xcf4a441593Fbf1Bf56960674C5a3a18049C7bbe2',
  OSM_MOM: '0x70465b57f4948198330DF49e80cB0b7b4A8563e9',
  PAXUSD: '0x493226477349795d74E106Eed6a2B6a5D437Edab',
  PIP_AAVE: '0x302DBc5F544f6Fe18f1CfF1bb5e971ba13236F4F',
  PIP_BAL: '0xc3e27cDDbb7A06f40Ded620a67dB858643da39C2',
  PIP_BAT: '0xdD35201726c511474e7E1EE426B5C78B014AddCc',
  PIP_COMP: '0xEd9521Ba67e5961401073C8F57A10396B9296Ff2',
  PIP_DGD: '0xb564f1dC7D220f8E20de45547de71620543c0053',
  PIP_ETH: '0x2d3AdFCa1e6aD360A138cBCF2F286f70a5Ff614A',
  PIP_GNT: '0x9783d28387f5097d72397388d98c52Ca9b18dec8',
  PIP_GUSD: '0x629cA18b145A870eFb230CF89aA626a4B2D3b228',
  PIP_KNC: '0x5e73B1F57f673EC875C1624D7C13F06Ef8259b23',
  PIP_LINK: '0x161AD3D1336814B895995D5EE8F1510ec3ccEA8C',
  PIP_LRC: '0x519a23560835856af262d7d829e1b9d89784DaA7',
  PIP_MANA: '0x7294588Da9cA5494fa6861A10B1Cc26096dC3b11',
  PIP_OMG: '0xE0d81d47aC1e791dd2559013cf1fF005e619d733',
  PIP_PAXUSD: '0xB5e8D7CcF287cF4adaBF00c8529e81cd416b9fa7',
  PIP_RENBTC: '0xB3CcF0B63055312b73530D1D0810c862A0690e95',
  PIP_REP: '0x80f178c7b47cb635Ceb12aBB891338744e98365C',
  PIP_TUSD: '0x870Cc2aFa004e22a49CAEa7392CC3bCD2ca96A3A',
  PIP_UNI: '0xF6bbB12EEE8B45214B2c8A8F9487982a35b7Ae81',
  PIP_USDC: '0xA70B7c2a55a76f89b64b4b15381FfF87279dD3d7',
  PIP_USDT: '0xc6c39b56d3dafcb213b4344D54e70E232b10ca48',
  PIP_WBTC: '0x298E3eb3C76938DA922EF01b99c87dF156985701',
  PIP_YFI: '0x174666d4101f6294EBa19D0846Ec85176D28F2e6',
  PIP_ZRX: '0xbD4d6688B679F27Bf6829922A4AE4E43D29153E4',
  PROXY_ACTIONS: '0x20EB41099150cF92A0576409520b72a0AD870c75',
  PROXY_ACTIONS_DSR: '0x04De75eD338D41D2E901bf703179D1049883aF5b',
  PROXY_ACTIONS_END: '0x9d0C1845c18bD93FB3514705715AAc54FB2135dd',
  PROXY_DEPLOYER: '0xf6a6D6319b037E1e87c471C6A9cbbA62F2Bf9631',
  PROXY_FACTORY: '0x8c12691dba1C6A76a358669c9fE72B9f968F4EAE',
  PROXY_PAUSE_ACTIONS: '0xa26bd0E2545bDD7a55826d43afeedf3c5A5dB2DA',
  PROXY_REGISTRY: '0x3ea503Fb236e6eE3B4d48b6Bd96Ba5F7Cf68AF94',
  RENBTC: '0x5d2132779D43A0B64F1f3e824B8A3163438358e8',
  REP: '0x77d6250c22eCBA016a4F6D1a917BF5b2ED0704C5',
  TUSD: '0x883c76966eA1D1AFEC54a1c20f84A57a287BB021',
  UNI: '0x2006CAA6901322b195e27aC007d2de1C09B7f19E',
  USDC: '0xfEB7149A008b52581F31717Fad5C5A23ea28cAE4',
  USDT: '0x6261bc3816Fa6A15dAcC68ff06baB082905f06bC',
  VAL_AAVE: '0x302DBc5F544f6Fe18f1CfF1bb5e971ba13236F4F',
  VAL_BAL: '0xc3e27cDDbb7A06f40Ded620a67dB858643da39C2',
  VAL_BAT: '0xdD35201726c511474e7E1EE426B5C78B014AddCc',
  VAL_COMP: '0xEd9521Ba67e5961401073C8F57A10396B9296Ff2',
  VAL_DGD: '0xb564f1dC7D220f8E20de45547de71620543c0053',
  VAL_ETH: '0x2d3AdFCa1e6aD360A138cBCF2F286f70a5Ff614A',
  VAL_GNT: '0x9783d28387f5097d72397388d98c52Ca9b18dec8',
  VAL_GUSD: '0x629cA18b145A870eFb230CF89aA626a4B2D3b228',
  VAL_KNC: '0x5e73B1F57f673EC875C1624D7C13F06Ef8259b23',
  VAL_LINK: '0x161AD3D1336814B895995D5EE8F1510ec3ccEA8C',
  VAL_LRC: '0x519a23560835856af262d7d829e1b9d89784DaA7',
  VAL_MANA: '0x7294588Da9cA5494fa6861A10B1Cc26096dC3b11',
  VAL_OMG: '0xE0d81d47aC1e791dd2559013cf1fF005e619d733',
  VAL_PAXUSD: '0xB5e8D7CcF287cF4adaBF00c8529e81cd416b9fa7',
  VAL_RENBTC: '0xB3CcF0B63055312b73530D1D0810c862A0690e95',
  VAL_REP: '0x80f178c7b47cb635Ceb12aBB891338744e98365C',
  VAL_TUSD: '0x870Cc2aFa004e22a49CAEa7392CC3bCD2ca96A3A',
  VAL_UNI: '0xF6bbB12EEE8B45214B2c8A8F9487982a35b7Ae81',
  VAL_USDC: '0xA70B7c2a55a76f89b64b4b15381FfF87279dD3d7',
  VAL_USDT: '0xc6c39b56d3dafcb213b4344D54e70E232b10ca48',
  VAL_WBTC: '0x298E3eb3C76938DA922EF01b99c87dF156985701',
  VAL_YFI: '0x174666d4101f6294EBa19D0846Ec85176D28F2e6',
  VAL_ZRX: '0xbD4d6688B679F27Bf6829922A4AE4E43D29153E4',
  VOTE_PROXY_FACTORY: '0x9fb9B0CCb0b6bcA8ff7667c1c1733F4469e27Af1',
  WBTC: '0x8A74211B5fC144A846fD1daA4dC8ABbB6268E18f',
  YFI: '0xbCaf9D36e65DfB2f098986D7e35420539EDe50E4',
  ZRX: '0xE6666822E10D3c5c33726Ea732506AaA50Ea0C88',
  MIGRATION: '0x2978B18F7c68B2957e701FC6D82C8De5B55833f2',
  MCD_JOIN_SAI: '0x565e5E6d6C43Aff09A5b3C2b33d710d9c2c63e06',
  SAI: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  OLD_MCD_CAT: '0x2125C30dA5DcA0819aEC5e4cdbF58Bfe91918e43',
  UNIV2DAIETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  PIP_UNIV2DAIETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_JOIN_UNIV2DAIETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_FLIP_UNIV2DAIETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  UNIV2WBTCETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  PIP_UNIV2WBTCETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_JOIN_UNIV2WBTCETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_FLIP_UNIV2WBTCETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  UNIV2USDCETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  PIP_UNIV2USDCETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_JOIN_UNIV2USDCETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_FLIP_UNIV2USDCETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  UNIV2DAIUSDC: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  PIP_UNIV2DAIUSDC: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_JOIN_UNIV2DAIUSDC_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_FLIP_UNIV2DAIUSDC_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  UNIV2ETHUSDT: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  PIP_UNIV2ETHUSDT: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_JOIN_UNIV2ETHUSDT_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_FLIP_UNIV2ETHUSDT_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  UNIV2LINKETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  PIP_UNIV2LINKETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_JOIN_UNIV2LINKETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_FLIP_UNIV2LINKETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  UNIV2UNIETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  PIP_UNIV2UNIETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_JOIN_UNIV2UNIETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_FLIP_UNIV2UNIETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  UNIV2WBTCDAI: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  PIP_UNIV2WBTCDAI: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_JOIN_UNIV2WBTCDAI_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_FLIP_UNIV2WBTCDAI_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  UNIV2AAVEETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  PIP_UNIV2AAVEETH: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_JOIN_UNIV2AAVEETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_FLIP_UNIV2AAVEETH_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  UNIV2DAIUSDT: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  PIP_UNIV2DAIUSDT: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_JOIN_UNIV2DAIUSDT_A: '0xC226F3CD13d508bc319F4f4290172748199d6612',
  MCD_FLIP_UNIV2DAIUSDT_A: '0xC226F3CD13d508bc319F4f4290172748199d6612'
};

const createAuctions = async () => {
  //Setting up custom kovan contracts

  const otherNetworksOverrides = [
    { network: 'testnet', contracts: kovanAddresses }
  ].reduce((acc, { network, contracts }) => {
    for (const [contractName, contractAddress] of Object.entries(contracts)) {
      if (!acc[contractName]) acc[contractName] = {};
      acc[contractName][network] = contractAddress;
    }
    return acc;
  }, {});

  const addressOverrides = ['testnet'].some(
    networkName => networkName === 'testnet'
  )
    ? otherNetworksOverrides
    : {};

  const cdpTypes = [
    { currency: ETH, ilk: 'ETH-A' },
    { currency: LINK, ilk: 'LINK-A' }
  ];

  const mcdPluginConfig = {
    cdpTypes,
    addressOverrides,
    network: 'testnet'
  };

  console.log('Initiating Maker Service from Dai.js');
  maker = await Maker.create('test', {
    plugins: [[McdPlugin, mcdPluginConfig]],
    smartContract: {
      addressOverrides
    },
    web3: {
      pollingInterval: 100
    }
    // url: 'http://localhost:2000'
    // privateKey: privateKey
  });

  web3 = await maker.service('web3')._web3;
  console.log('web3 ', await web3.eth.net.getNetworkType());

  const kprAddress = maker.currentAddress();
  const linkToken = await maker.getToken(LINK);
  linkBalance = await linkToken.balance();
  console.log('Current Wallet Address: ', kprAddress);
  console.log('Link balance ', linkBalance._amount);

  if (Number(linkBalance._amount) < 16.49) throw 'NOT ENOUGHT LINK-A BALANCE';

  console.log('Ensure there is proxy address');
  await maker.service('proxy').ensureProxy();
  const proxyAddress = await maker.service('proxy').getProxyAddress();
  console.log('Proxy Address: ', proxyAddress);

  //Check for token allowance
  const linkAllowance = await linkToken.allowance(kprAddress, proxyAddress);
  if (Number(linkAllowance._amount) === 0) {
    console.log('Approving Proxy to use LINK');
    await linkToken.approveUnlimited(proxyAddress);
  }

  // while (Number(linkBalance._amount) > 16.49) {
  await createVaults();
  // }

  //Barking on all urns
  console.log(' ');
  console.log('Risky Urns');

  const dogContract = new web3.eth.Contract(dogAbi, dogAddress);

  const bark = async urn => {
    await dogContract.methods
      .bark(ilk, urn, kprAddress)
      .send({
        from: kprAddress,
        gasPrice: '20000000000'
      })
      .on('error', error => console.log(error))
      .on('receipt', receipt =>
        console.log('Tx Hash: ', receipt.transactionHash)
      );
  };

  for (let i = 0; i < urns.length; i++) {
    console.log('Barking ', urns[i]);
    await bark(urns[i]);
  }

  console.log('Barked Urns: ');
  for (let i = 0; i < urns.length; i++) {
    console.log(urns[i]);
  }

  process.kill(process.pid, 'SIGTERM');
};

const createVaults = async () => {
  //create risky vault using ETH-A
  console.log(' ');
  console.log(
    '--------------------------------------------------------------------'
  );
  console.log('Creating risky vault');
  const manager = maker.service('mcd:cdpManager');

  const vault = await manager.open('LINK-A');
  let vaultId = vault.id;
  console.log('Vault ID', vaultId);

  const linkAmt = 20;

  console.log(`Locking ${linkAmt} LINK-A`);
  // await manager.lock(vault.id, 'LINK-A', LINK(16.49));
  await manager.lock(vault.id, 'LINK-A', LINK(linkAmt));

  linkBalance = await maker.getToken(LINK).balance();

  console.log('mining blocks');
  await mineBlocks(maker.service('web3'), 6);

  // const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  // console.log('sleeping');
  // await sleep(20000);

  console.log(' ');
  console.log('Dripping LINK-A JUG');
  await maker
    .service('smartContract')
    .getContract('MCD_JUG')
    .drip(ilk);

  // Refreshing vault data
  vault.reset();
  await vault.prefetch();

  // Reading Vault Information
  let managedVault = await manager.getCdp(vaultId);
  managedVault.reset();
  await managedVault.prefetch();
  const vaultUrnAddr = await manager.getUrn(vaultId);
  console.log('Vault: Urn Address', vaultUrnAddr);
  urns.push(vaultUrnAddr);

  const amtDai = await managedVault.daiAvailable._amount;

  console.log('Collateral Value: ', managedVault.collateralValue._amount);
  console.log('DAI Available to Generate', managedVault.daiAvailable._amount);
  console.log('Debt Value: ', managedVault.debtValue._amount);
  console.log(
    'Collateralization Ratio ',
    managedVault.collateralizationRatio._amount
  );
  console.log('Liquidation Price ', managedVault.liquidationPrice._amount);
  console.log('Is Vault safe? ', managedVault.isSafe);

  console.log(' ');
  console.log(`Drawing ${DAI(amtDai.toFixed(17))} from Vault #${vaultId}`);

  try {
    let drawDai = await manager.draw(
      vaultId,
      'LINK-A',
      DAI(amtDai.toFixed(17))
    );
    drawDai;
  } catch (error) {
    console.error(error);
  }

  console.log(' ');
  console.log('Dripping LINK-A JUG');
  await maker
    .service('smartContract')
    .getContract('MCD_JUG')
    .drip(ilk);

  //Refreshing Vault Data
  managedVault.reset();
  await managedVault.prefetch();

  // Getting Updated state from Vault
  console.log(' ');
  console.log('Collateral Value: ', managedVault.collateralValue._amount);
  console.log('DAI Available to Generate', managedVault.daiAvailable._amount);
  console.log('Debt Value: ', managedVault.debtValue._amount);
  console.log(
    'Collateralization Ratio ',
    managedVault.collateralizationRatio._amount
  );
  console.log('Liquidation Price ', managedVault.liquidationPrice._amount);
  console.log('Is Vault safe? ', managedVault.isSafe);
};

const dogAbi = [
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'ilk',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'urn',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'kpr',
        type: 'address'
      }
    ],
    name: 'bark',
    outputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

export default createAuctions;
