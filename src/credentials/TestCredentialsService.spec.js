import TestCredentialsService from './TestCredentialsService';

test('returns the credentials supplied at instantiation', () => {
  const loginName = 'mytestlogin';
  const password = 'mytestpassword';
  const service = new TestCredentialsService(loginName, password);

  expect.assertions(2);

  return service.getCredentials().then((credentials) => {
    expect(credentials[0].loginName).toEqual(loginName);
    expect(credentials[0].password).toEqual(password);
  });
});
