<template>
    <div class="makerDebugger">
        <contract-explorer
            :node-map="nodeMap"
            :block-number="blockNumber"
            :roots="['SAI_TUB']"
            :reloading="reloading"
            class="contractExplorer"
        ></contract-explorer>
        <transaction-list :transactions="transactions"></transaction-list>
    </div>
</template>

<script>
  import ContractExplorer from './ContractExplorer.vue';
  import TransactionList from "./TransactionList.vue";

  let timerId = null;

  export default {
    name: "MakerDebugger",
    created: function() {

      this.maker.service('web3').onNewBlock(blockNumber => {
        this.blockNumber = blockNumber;

        if (timerId !== null) {
          clearTimeout(timerId);
        }

        timerId = setTimeout(() => {
          this.maker.service('smartContract').inspect().then(debugInfo => {
            this.nodeMap = debugInfo;
            this.logItems = [];
            Object.values(debugInfo).forEach(i => this.logItems.push(i.getInfo()));
            this.reloading = (timerId !== null);
          });
          timerId = null;
        }, 2500);

        this.reloading = true;
      });

      this.maker.service('transactionManager').onNewTransaction(tx => {
        this.transactions = [tx].concat(this.transactions);
      });
    },
    data: function() {
      return {
        blockNumber: this.maker.service('web3').blockNumber(),
        logItems: [],
        nodeMap: null,
        transactions: [],
        reloading: false
      };
    },
    props: {
      maker: {
        type: Object,
        required: true
      }
    },
    components: {
      TransactionList,
      ContractExplorer
    }
  }
</script>

<style lang="scss" scoped>
    .makerDebugger {
        font-size: 80%;
        color: darkslategrey;
        padding: 0;
        margin: 0;
    }

    .contractExplorer {
        float: right;
        width: 50%;
    }

    .transactionList {
        display: block;
        position: relative;
        width: 50%;
    }
</style>