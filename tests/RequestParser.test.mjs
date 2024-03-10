import RequestParser from '../app/RequestParser.js';
import { expect } from 'chai';

// Describe block for the test suite
describe('RequestParser', () => {

    it('Test 1', () => {
        const parser = new RequestParser('*2\r\n$4\r\necho\r\n$3\r\nhey\r\n');
        const args = parser.parse();
        expect(args).to.deep.equal(['echo', 'hey']);

        const remainingRequest = parser.getRemainingRequest();
        expect(remainingRequest).to.equal('');
    });

    it('Test 2', () => {
        const parser = new RequestParser('*2\r\n$4\r\necho\r\n$3\r\nhey\r\n*2\r\n$4\r\necho\r\n$4\r\nheya\r\n');
        const args = parser.parse();
        expect(args).to.deep.equal(['echo', 'hey']);

        const remainingRequest = parser.getRemainingRequest();
        expect(remainingRequest).to.equal('*2\r\n$4\r\necho\r\n$4\r\nheya\r\n');

        const args2 = parser.parse();
        expect(args2).to.deep.equal(['echo', 'heya']);

        const remainingRequest2 = parser.getRemainingRequest();
        expect(remainingRequest2).to.equal('');

    });

    it('Test 3', () => {
        const parser = new RequestParser('*2\r\n$4\r\nec');
        const args = parser.parse();
        expect(args).to.deep.equal([]);

        const remainingRequest = parser.getRemainingRequest();
        expect(remainingRequest).to.equal('*2\r\n$4\r\nec');
    });
});
