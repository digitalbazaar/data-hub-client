import base64url from 'base64url-universal';
import {MockKak} from './MockKak';
// eslint-disable-next-line
import X25519KeyAgreementKey2019 from './vectors/X25519KeyAgreementKey2019.json';

describe('X25519KeyAgreementKey2019', () => {
  const kak = new MockKak({secretKey:
        new TextEncoder('utf-8').encode(
          X25519KeyAgreementKey2019.secret)
  });
  it('deriveSecret conforms to test vectors', done => {
    kak.deriveSecret({
      publicKey: X25519KeyAgreementKey2019.publicKey
    }).then(secret => {
      base64url.encode(secret).should.equal(
        X25519KeyAgreementKey2019.derivedSecret
      );
      done();
    });
  });
  // TODO: missing verify
});
