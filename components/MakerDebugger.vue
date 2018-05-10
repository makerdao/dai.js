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
    data: function() {
      return {
        logItems: ['item 1', 'item 2', 'item 3']
      };
    }
  }
</script>

<style lang="scss" scoped>
    .makerDebugger {
        font-size: 80%;
        color: darkslategrey;
    }
</style>