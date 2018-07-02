<template>
    <span :class="classNames" :title="previousValue ? `Previous value: ${previousValue}` : ''">{{value}}</span>
</template>

<script>
  let timerId = null;

  export default {
    name: "ObservableValue",
    data: function() {
      return {
        classNames: 'observableValue',
        previousValue: null
      };
    },
    props: {
      value: {
        default: null
      }
    },
    watch: {
      value: function(newValue, oldValue) {
        this.previousValue = oldValue;
        this.classNames = 'observableValue observableValue--highlight';
        if (timerId !== null) {
          clearTimeout(timerId);
        }
        setTimeout(() => {
          this.classNames = 'observableValue';
          timerId = null;
        }, 2100);
      }
    }
  }
</script>

<style scoped>
    .observableValue {
        display: inline-block;
        padding: 1px 3px;
        border-radius: 3px;
        font-weight: normal;
    }

    .observableValue--highlight {
        animation: highlight 2000ms ease-out;
    }

    @keyframes highlight {
        0% {
            background-color: yellow;
        }
        100% {
            background-color: white;
        }
    }
</style>