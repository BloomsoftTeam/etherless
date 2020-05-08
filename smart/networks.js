const HDWalletProvider = require('@truffle/hdwallet-provider');

require('dotenv').config();

module.exports = {
  networks: {
    development: {
      protocol: 'http',
      host: 'localhost',
      port: 8545,
      gas: 5000000,
      gasPrice: 5e9,
      networkId: '*',
    },
    ropsten: {
      // must be a thunk, otherwise truffle commands may hang in CI
      provider: () =>
        new HDWalletProvider(process.env.MNEMONIC, `https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`),
      network_id: '3',
      gasPrice: 10e9
    }
  },
};
