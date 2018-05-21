<template>
    <div class="nodeList" :style="marginLeft">
        <div v-for="node in selectedNodes" class="nodeList__node">
            <div class="nodeList__nodeInfo">
                <span v-if="expandable(node)" v-on:click="expand()" class="nodeList__nodeState nodeList__nodeState--collapsed">+</span>
                <span v-else-if="collapsible(node)" v-on:click="collapse()" class="nodeList__nodeState nodeList__nodeState--expanded">-</span>
                <span v-else class="nodeList__nodeState nodeList__nodeState--leaf">&nbsp;</span>
                <div class="nodeList__nodeName" :title="node.info">
                    <span v-on:click="toggle(node)">{{node.name}}</span> : {{node.value}}
                </div>
            </div>
            <node-list v-if="expanded"
               :node-map="nodeMap"
               :selected="node.children"
               :indentation="childIndentation">
            </node-list>
        </div>
    </div>
</template>

<script>
  export default {
    name: "NodeList",
    data: function() {
      return {
        expanded: (this.indentation === 0)
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
      }
    },
    computed: {
      selectedNodes: function() {
        return this.selected.map(id => ({ ...this.nodeMap[id].getInfo(), children: this.nodeMap[id].children }));
      },
      marginLeft: function() {
        return `margin-left: ${this.indentation > 0 ? 1 : 0}em;`;
      },
      childIndentation: function() {
        return this.indentation + 1;
      }
    },
    methods: {
      expand: function() {
        this.expanded = true;
      },
      collapse: function() {
        this.expanded = false;
      },
      toggle: function(node) {
        if (this.expandable(node)) {
          this.expand();
        } else if (this.collapsible(node)) {
          this.collapse();
        }
      },
      expandable: function(node) {
        return node.children.length > 0 && !this.expanded;
      },
      collapsible: function(node) {
        return node.children.length > 0 && this.expanded;
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

    .nodeList__nodeName > span {
        font-weight: bold;
        cursor: pointer;
    }

    .nodeList__nodeState {
        font-family: monospace;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
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