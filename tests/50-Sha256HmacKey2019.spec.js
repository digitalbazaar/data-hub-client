import {MockHmac} from './MockHmac';
import Sha256HmacKey2019 from './vectors/Sha256HmacKey2019.json';

describe('Sha256HmacKey2019', () => {
  it('sign conforms to test vectors', done => {
    MockHmac.create(Sha256HmacKey2019.secret).then(async hmac => {
      const signed = await hmac.sign({data: Sha256HmacKey2019.message});
      signed.should.equal(Sha256HmacKey2019.signature);
      done();
    });
  });
  it('verify conforms to test vectors', done => {
    MockHmac.create(Sha256HmacKey2019.secret).then(async hmac => {
      const verified = await hmac.verify({
        data: Sha256HmacKey2019.message,
        signature: Sha256HmacKey2019.signature
      });
      verified.should.equal(true);
      done();
    });
  });
});
