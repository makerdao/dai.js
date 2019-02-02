# @makerdao/services-core

### Usage

TODO: finish this example.

```js
class MyService extends PrivateService {
  constructor(name = 'serviceRoleName') {
    super(name, dependencyRoleNames);
  }

  initialize(settings) {
    // initialize() for all its dependencies will run first
  }

  connect() {
    // connect() for all its dependencies will run first
  }

  authenticate() {
    // authenticate() for all its dependencies will run first
  }
}
```

### Developing

This is in the process of becoming its own standalone module.

While it still lives inside `dai.js`, note this gotcha: Whenever you make changes to this module, you must run `yarn add ./lib/services-core` to copy the changes into the main project's `node_modules`.

### Checklist when making this a standalone module

- [ ] Remove the `postinstall` script in package.json that runs babel
- [ ] Update this README
- [ ] `npm publish`

In the main project:
- [ ] Update `package.json` to depend on the newly published version of this
- [ ] Re-run `yarn` to update `yarn.lock`
