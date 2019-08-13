# @makerdao/services-core

A dependency injection framework used in [dai.js](https://github.com/makerdao/dai.js).

### TODO

- [ ] create full usage example

### Usage (TODO)

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
