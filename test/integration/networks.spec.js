test('mainnet test', () => {
  console.log(process.env.NETWORK);
  expect(1).toEqual(1);
});
