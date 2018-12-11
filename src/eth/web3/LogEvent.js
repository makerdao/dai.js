export function getTopics(event, sha3) {
  let topics = [];
  let name = event.name + '(';
  for (let i in event.inputs) {
    name += event.inputs[i].type + ',';
  }
  topics[0] = sha3(name.substring(0, name.length - 1) + ')');
  if (event.anonymous) topics.shift();
  return topics;
}

export function parseRawLog(log, event, decoder) {
  if (!event.anonymous) {
    log.topics.shift();
  }
  return decoder.decodeLog(event.inputs, log.data, log.topics);
}

export default function getMatchingEvent(
  web3,
  info,
  event,
  predicateFn = () => true
) {
  const { address, abi } = info;
  const decoder = web3.eth.abi;
  const { sha3 } = web3.utils;

  const abiObj = abi.reduce(
    (acc, target) => ({
      ...acc,
      [target.name]: target
    }),
    {}
  );

  const topics = getTopics(abiObj[event], sha3);

  return new Promise((resolve, reject) => {
    const sub = web3.eth.subscribe(
      'logs',
      { address, topics },
      (err, rawLogData) => {
        if (err) reject(err);
        const log = parseRawLog(rawLogData, abiObj[event], decoder);
        if (predicateFn(log)) {
          sub.unsubscribe((err, success) => {
            if (!success) {
              reject(err);
            }
          });
          resolve(log);
        }
      }
    );
  });
}
