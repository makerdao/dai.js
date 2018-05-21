<template>
    <div class="transactionList">
        <div class="transactionList__header">
            <strong>Transaction Log</strong>
        </div>
        <div class="transactionList__list">
            <div v-for="tx in transactions" class="transactionList__transaction">
                <div class="transactionList__transactionId">{{tx._txId}}.</div>
                <div class="transactionList__transactionTimeStamp">{{getTimeStamp(tx)}}</div>
                <div :class="txClass(tx)">{{tx.state()}}</div>
                <div class="transactionList__callInfo" v-html="callInfo(tx)"></div>
            </div>
        </div>
    </div>
</template>

<script>
  export default {
    name: "TransactionList",
    props: {
      transactions: {
        type: Array,
        required: true
      }
    },
    methods: {
      txClass: function(tx) {
        return `transactionList__transactionState transactionList__transactionState--${tx.state()}`;
      },
      callInfo: function(tx) {
        let result = '';

        if (tx._original && tx._original._transaction && tx._original._transaction._callInfo) {
          result = '<strong>' + tx._original._transaction._callInfo.contract + '.' +
            tx._original._transaction._callInfo.call + '</strong> (' +
            tx._original._transaction._callInfo.args.map(a => JSON.stringify(a._bn ? a.toString() : a)).join(', ') + ')';
        }

        return result;
      },
      getTimeStamp: function(tx) {
        let ts = tx._original.timeStampSubmitted();
        return `${ts.getFullYear()}-${ts.getMonth()+1}-${ts.getDate()} ${ts.getHours()}:${ts.getMinutes()}:${ts.getSeconds()}`;
      }
    }
  }
</script>

<style scoped>
    .transactionList {
        position: relative;
        margin: 0;
        padding: 0;
    }

    .transactionList__header {
        box-sizing: border-box;
        padding: 0.5em;
        border-bottom: 1px solid #AAA;
        background-color: rgba(256, 256, 256, 0.9);
        width: 100%;
        height: 2.5em;
    }

    .transactionList__list {
        margin-top: 0.5em;
    }

    .transactionList__transaction {
        padding: 0.5em;
        border-bottom: 1px solid #DDD;
    }

    .transactionList__transactionId {
        display: inline-block;
        font-weight: bold;
    }

    .transactionList__transactionTimeStamp {
        display: inline-block;
        margin-left: 0.5em;
    }

    .transactionList__callInfo {
        font-size: 85%;
        color: #666;
        margin: 0.5em 0 0.5em 2.4em;
        line-height: 130%;
    }

    .transactionList__transactionState {
        display: inline-block;
        margin-left: 0.5em;
        padding: 2px 0;
        border-radius: 3px;
        width: 8.5em;
        text-align: center;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
        color: white;
    }

    .transactionList__transactionState--initialized {
        background-color: blue;
    }

    .transactionList__transactionState--pending {
        background-color: blue;
    }

    .transactionList__transactionState--mined {
        background-color: orange;
    }

    .transactionList__transactionState--finalized {
        background-color: darkgreen;
    }

    .transactionList__transactionState--error {
        background-color: darkred;
    }
</style>