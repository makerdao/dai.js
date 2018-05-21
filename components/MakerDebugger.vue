<template>
    <div class="makerDebugger">
        <contract-explorer
            :node-map="nodeMap"
            :block-number="blockNumber"
            :roots="['SAI_TUB']"
            :reloading="reloading"
            class="contractExplorer"
        ></contract-explorer>
    </div>
</template>

<script>
  import ContractExplorer from './ContractExplorer.vue';

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
    },
    data: function() {
      return {
        blockNumber: this.maker.service('web3').blockNumber(),
        logItems: [],
        nodeMap: null,
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
</style>