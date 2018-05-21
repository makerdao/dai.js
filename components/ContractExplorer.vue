<template>
    <div class="contractExplorer">
        <div class="contractExplorer__header">
            <strong>Smart Contract Explorer</strong> &ndash;
            <div class="contractExplorer__blockNumber">
                <span class="contractExplorer__blockNumberLabel">block </span>
                <span class="contractExplorer__blockNumberValue">{{blockNumber}}</span>
            </div>
            <div v-if="reloading" class="contractExplorer__reloadIndicator">reloading...</div>
        </div>
        <node-list
            v-if="!!nodeMap"
            :node-map="nodeMap"
            :selected="roots"
            :indentation="0"
            class="contractExplorer__nodeList"
        >
        </node-list>
    </div>
</template>

<script>
  import NodeList from "./NodeList.vue";

  export default {
    name: "ContractExplorer",
    props: {
      nodeMap: {
        type: Object,
        default: null
      },
      blockNumber: {
        type: Number,
        required: true
      },
      roots: {
        type: Array,
        required: true
      },
      reloading: {
        type: Boolean,
        default: false
      }
    },
    computed: {
      rootNodes: function() {
        return this.roots.map(root => this.nodeMap[root]);
      }
    },
    components: {
      NodeList
    }
  }
</script>

<style scoped>
    .contractExplorer {
        position: relative;
        margin: 0;
        padding: 0;
    }

    .contractExplorer__header {
        padding: 0.5em 0 0.25em 0;
        margin: 0 0 0.25em 0;
        height: 20px;
        border-bottom: 1px solid #AAA;
        position: fixed;
        top: 0;
        background-color: rgba(256, 256, 256, 0.9);
        width: 100%;
    }

    .contractExplorer__nodeList {
        margin-top: 28px
    }

    .contractExplorer__blockNumber {
        display: inline-block;
    }

    .contractExplorer__reloadIndicator {
        display: inline-block;
        font-size: 75%;
        color: white;
        background-color: cornflowerblue;
        padding: 2px 4px;
        margin: 0 1em;
        border-radius: 3px;
    }
</style>