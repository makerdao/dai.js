<template>
    <div class="makerDebugger">
        <ul>
            <li v-for="log in logItems">{{log}}</li>
        </ul>
    </div>
</template>

<script>
  export default {
    name: "MakerDebugger",
    created: function() {
      this.maker.service('smartContract')
        .getContractState('SAI_TUB', 0, true, [])
        .then(s => Object.keys(s).forEach(k => this.logItems.push(`${k}: ${s[k]}`)));
    },
    data: function() {
      return {
        logItems: []
      };
    },
    props: {
      maker: {
        type: Object,
        required: true
      }
    }
  }
</script>

<style lang="scss" scoped>
    .makerDebugger {
        font-size: 80%;
        color: darkslategrey;
    }
</style>