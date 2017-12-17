const ServiceState = {
  CREATED: 'CREATED',
  INITIALIZING: 'INITIALIZING',
  OFFLINE: 'OFFLINE',
  CONNECTING: 'CONNECTING',
  ONLINE: 'ONLINE',
  AUTHENTICATING: 'AUTHENTICATING',
  READY: 'READY',
  ERROR: 'ERROR'
};

const localServiceLifeCycle = {
  CREATED: [ServiceState.INITIALIZING],
  INITIALIZING: [ServiceState.CREATED, ServiceState.READY],
  READY: [ServiceState.ERROR],
  ERROR: [],
};

const publicServiceLifeCycle = {
  CREATED: [ServiceState.INITIALIZING],
  INITIALIZING: [ServiceState.CREATED, ServiceState.OFFLINE],
  OFFLINE: [ServiceState.CONNECTING],
  CONNECTING: [ServiceState.OFFLINE, ServiceState.READY],
  READY: [ServiceState.OFFLINE, ServiceState.ERROR],
  ERROR: [],
};

const privateServiceLifeCycle = {
  CREATED: [ServiceState.INITIALIZING],
  INITIALIZING: [ServiceState.CREATED, ServiceState.OFFLINE],
  OFFLINE: [ServiceState.CONNECTING],
  CONNECTING: [ServiceState.OFFLINE, ServiceState.ONLINE],
  ONLINE: [ServiceState.OFFLINE, ServiceState.AUTHENTICATING],
  AUTHENTICATING: [ServiceState.ONLINE, ServiceState.READY],
  READY: [ServiceState.OFFLINE, ServiceState.ONLINE, ServiceState.ERROR],
  ERROR: [],
};

export {
  ServiceState as default,
  localServiceLifeCycle,
  publicServiceLifeCycle,
  privateServiceLifeCycle
};