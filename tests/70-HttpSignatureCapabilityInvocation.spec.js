import fs from 'fs';
import path from 'path';
import {signCapabilityInvocation} from 'http-signature-zcap-invoke';
import {MockHmac} from './MockHmac';
import {MockInvoker} from './MockInvoker';
// eslint-disable-next-line
import didKeyFixtures from './vectors/ed25519-x25519.json';
import Sha256HmacKey2019 from './vectors/Sha256HmacKey2019.json';
// eslint-disable-next-line
import HttpSignatureCapabilityInvocation from './vectors/HttpSignatureCapabilityInvocation.json';

let fixture = {};

// eslint-disable-next-line
const verificationKeyPair = didKeyFixtures['did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp']
  .verificationKeyPair;

// eslint-disable-next-line
const keyAgreementKeyPair = didKeyFixtures['did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp']
  .keyAgreementKeyPair;

let hmac;
let invocationSigner;
before(done => {
  invocationSigner = new MockInvoker(
    {
      ...verificationKeyPair,
      id: verificationKeyPair.controller + verificationKeyPair.id
    }
  );
  MockHmac.create(Sha256HmacKey2019.secret).then(async _hmac => {
    hmac = _hmac;
    done();
  });
});

after(() => {
  fs.writeFileSync(path.resolve(__dirname,
    './vectors/HttpSignatureCapabilityInvocation.json'
  ),
  JSON.stringify(fixture, null, 2));
});

describe('HttpSignatureCapabilityInvocation', () => {
  describe('Vault', () => {
    it('can create', done => {
      const url = `http://localhost:9876/edvs`;
      const defaultHeaders = {
        Accept: 'application/ld+json, application/json'
      };
      const capability = `http://localhost:9876/edvs/zcaps/vaults`;
      const body = {
        sequence: 0,
        controller: keyAgreementKeyPair.controller,
        keyAgreementKey: {
          id: keyAgreementKeyPair.controller + keyAgreementKeyPair.id,
          type: 'X25519KeyAgreementKey2019'
        },
        hmac: {
          id: hmac.id,
          type: 'Sha256HmacKey2019'
        }
      };
      signCapabilityInvocation({
        url, method: 'post', headers: defaultHeaders,
        json: body, capability, invocationSigner,
        capabilityAction: 'write'
      }).then(headers => {
        fixture = {
          ...fixture,
          vault: {
            ...fixture.vault,
            create: {
              headers,
              url,
              body,
            }
          }
        };
        // blocked by
        // https://github.com/digitalbazaar/http-signature-zcap-invoke/issues/11
        // fixture.vault.create.should.deep.equal(
        //   HttpSignatureCapabilityInvocation.vault.create
        // );
        done();
      });
    });
  });
});
