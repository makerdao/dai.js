// Set `boxes[SAI_TUB]` and so on to addresses from the environment.
/*
let boxes = (
  "GEM GOV PIP PEP PIT ADM SAI SIN SKR DAD MOM VOX TUB TAP TOP".split(" ")
).reduce((o, x) => Object.assign(o, { [x] : process.env[`SAI_${x}`] }), {});

// Use the environment's testnet RPC URL
let Web3 = require("web3");
let web3 = new Web3(
  new Web3.providers.HttpProvider(process.env["ETH_RPC_URL"])
);

console.log(boxes);

/* How to instantiate ABIs into Web3 contracts (this is for Web3 1.0, oops)
let abi = (box, addr) => new web3.eth.Contract(
  JSON.parse(require("fs").readFileSync(`lib/sai/out/${box}.abi`)),
  addr
);

// Parse some of the Sai system contracts
let sys = {
  tub: abi("SaiTub", boxes.TUB),
  gem: abi("DSToken", boxes.GEM),
  skr: abi("DSToken", boxes.SKR),
  sai: abi("DSToken", boxes.SAI),
};
*//*

async function start () {
  [
    '0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6',
    '0x81431b69b1e0e334d4161a13c2955e0f3599381e',
    '0xda1495ebd7573d8e7f860862baa3abecebfa02e0',
    '0xb76a5a26ba0041eca3edc28a992e4eb65a3b3d05',
    '0x5ecf66ecb148594c68c3d24e0b3540039d3e208e',
    '0x010cc8f37ab1f7fde9b61129f99359b6bb480c52',
    '0xa1a828e71fc501126ab0a0a92334a0d1bc859c18',
    '0x38eeb0da52f8d267bcf6143b277ad929d2caba1f',
    '0x75be2d1186d2806b61f1ac984475979eeed18702',
    '0xececc8efe05fcf7e7490db77a334f2880480b9e9'

  ].forEach(async function(address) {
    await web3.eth.getBalance(address, function (error, result) {
      if (!error) {
        console.log(address + ' :: ' + web3.utils.fromWei(result));
      }
    });
  });
}

start();*/