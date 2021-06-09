import base64url from 'base64url-universal';
import {MockInvoker} from './MockInvoker';
// eslint-disable-next-line
import Ed25519VerificationKey2018 from './vectors/Ed25519VerificationKey2018.json';

describe('Ed25519VerificationKey2018', () => {
  const invoker = new MockInvoker(Ed25519VerificationKey2018.keyPair);
  it('sign conforms to test vectors', done => {
    invoker.sign({
      data: Buffer.from(Ed25519VerificationKey2018.message)
    }).then(signed => {
      base64url.encode(signed).should.equal(
        Ed25519VerificationKey2018.signature
      );
      done();
    });
  });
  // TODO: missing verify
});
