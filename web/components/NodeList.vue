<template>
    <div class="nodeList" :style="marginLeft">
        <div v-for="node in selectedNodes" class="nodeList__node">
            <div class="nodeList__nodeInfo">
                <span v-if="expandable(node)" v-on:click="expand(node)" class="nodeList__nodeState nodeList__nodeState--collapsed">+</span>
                <span v-else-if="collapsible(node)" v-on:click="collapse(node)" class="nodeList__nodeState nodeList__nodeState--expanded">-</span>
                <span v-else class="nodeList__nodeState nodeList__nodeState--leaf">&nbsp;</span>
                <div class="nodeList__nodeName" :title="node.info">
                    <span class="nodeList__nodeName" v-on:click="toggle(node)">{{node.name}}</span> :
                    <observable-value v-if="!node.isError" :value="node.value"></observable-value>
                    <div v-else class="nodeList__nodeError">{{node.value}}</div>
                    <div v-if="!!getSingleContractChild(node)" class="nodeList__nodeTag">
                        {{getSingleContractChild(node)}}
                    </div>
                </div>
            </div>
            <node-list v-if="isExpanded(node)"
               :node-map="nodeMap"
               :selected="getChildren(node)"
               :indentation="childIndentation">
            </node-list>
        </div>
    </div>
</template>

<script>
  import ObservableValue from "./ObservableValue.vue";
  export default {
    name: "NodeList",
    components: {ObservableValue},
    data: function() {
      return {
        expanded: this.selected.length === 1 ? this.selected : []
      };
    },
    props: {
      nodeMap: {
        type: Object,
        required: true
      },
      selected: {
        type: Array,
        required: true
      },
      indentation: {
        type: Number,
        default: 0
      },
      sortContractsFirst: {
        type: Boolean,
        default: false
      }
    },
    computed: {
      selectedNodes: function() {
        let result = this.selected.map(id => ({ ...this.nodeMap[id].getInfo(), children: this.nodeMap[id].children }));
        result.sort((a, b) => {
          let scoreA = (this.sortContractsFirst && a.children.length > 0 ? 2 : 0) + (a.name < b.name ? 1 : 0);
          let scoreB = (this.sortContractsFirst && b.children.length > 0 ? 2 : 0) + (a.name > b.name ? 1 : 0);
          return scoreB - scoreA;
        });
        return result;
      },
      marginLeft: function() {
        return `margin-left: ${this.indentation > 0 ? 1 : 0}em;`;
      },
      childIndentation: function() {
        return this.indentation + 1;
      }
    },
    methods: {
      expand: function(node) {
        this.expanded.push(node.name);
      },
      collapse: function(node) {
        this.expanded = this.expanded.filter(exp => exp !== node.name);
      },
      toggle: function(node) {
        if (this.expandable(node)) {
          this.expand(node);
        } else if (this.collapsible(node)) {
          this.collapse(node);
        }
      },
      expandable: function(node) {
        return node.children.length > 0 && this.expanded.indexOf(node.name) < 0;
      },
      collapsible: function(node) {
        return node.children.length > 0 && this.expanded.indexOf(node.name) > -1;
      },
      isExpanded: function(node) {
        return this.expanded.indexOf(node.name) > -1;
      },
      getSingleContractChild: function(node) {
        if (node.children.length === 1) {
          const info = this.nodeMap[node.children[0]].getInfo();
          return (info.type === 'contract' ? info.name : null);
        }
        return null;
      },
      getChildren(node) {
        return !!this.getSingleContractChild(node) ?
          this.nodeMap[node.children[0]].children : node.children;
      }
    }
  }
</script>

<style scoped>
    .nodeList__nodeInfo {
        padding: 4px;
        animation: highlight 1000ms ease-out;
    }

    .nodeList__nodeInfo:hover {
        background-color: #F6F6F6;
    }

    .nodeList__nodeName {
        display: inline-block;
    }

    span.nodeList__nodeName {
        font-weight: bold;
        cursor: pointer;
    }

    .nodeList__nodeState {
        font-family: monospace;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
    }

    .nodeList__nodeTag {
        font-size: 10px;
        display: inline-block;
        font-weight: bold;
        vertical-align: center;
        background-color: #999;
        color: white;
        margin-left: 1em;
        padding: 1px 3px;
        border-radius: 3px;
    }

    .nodeList__nodeError {
        display: inline;
        color: red;
    }

    @keyframes highlight {
        0% {
            background-color: lightyellow;
        }
        100% {
            background-color: white;
        }
    }
</style>