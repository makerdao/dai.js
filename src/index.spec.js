import sayHello from './hello';

test('should return Hello World!', () => {
	expect(sayHello()).toBe('Hello World!');
});