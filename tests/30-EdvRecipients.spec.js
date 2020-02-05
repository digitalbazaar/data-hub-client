/*!
* Copyright (c) 2018-2019 Digital Bazaar, Inc. All rights reserved.
*/
const didMethodKey = require('did-method-key');
const jsigs = require('jsonld-signatures');
const uuid = require('uuid-random');
const {CapabilityDelegation} = require('ocapld');
import {EdvClient} from '..';
import mock from './mock.js';
import {isRecipient} from './test-utils.js';

const {SECURITY_CONTEXT_V2_URL, sign, suites} = jsigs;
const {Ed25519Signature2018} = suites;

const JWE_ALG = 'ECDH-ES+A256KW';

describe('Edv Recipients', () => {
  let invocationSigner, keyResolver, driver = null;

  before(async () => {
    driver = didMethodKey.driver();
    await mock.init();
    invocationSigner = mock.invocationSigner;
    keyResolver = mock.keyResolver;
  });

  after(async () => {
    await mock.server.shutdown();
  });

  const createKeyAgreementKey = async () => {
    const didKey = await driver.generate();
    const [kaK] = didKey.keyAgreement;
    mock.keyStorage.set(
      didKey.id, {'@context': 'https://w3id.org/security/v2', ...kaK});
    return didKey;
  };

  const createRecipient = didKey => {
    const {id: kid} = didKey;
    return {header: {kid, alg: JWE_ALG}};
  };

  // this test should be identical to the insert test
  // except that recipients is passed in
  it('should insert a document with a single recipient', async () => {
    const {keyAgreementKey} = mock.keys;
    const client = await mock.createEdv();
    const testId = await EdvClient.generateId();
    const doc = {id: testId, content: {someKey: 'someValue'}};
    const recipients = [{header: {kid: keyAgreementKey.id, alg: JWE_ALG}}];
    const inserted = await client.insert(
      {keyResolver, invocationSigner, doc, recipients});
    should.exist(inserted);
    inserted.should.be.an('object');
    inserted.id.should.equal(testId);
    inserted.sequence.should.equal(0);
    inserted.indexed.should.be.an('array');
    inserted.indexed.length.should.equal(1);
    inserted.indexed[0].should.be.an('object');
    inserted.indexed[0].sequence.should.equal(0);
    inserted.indexed[0].hmac.should.be.an('object');
    inserted.indexed[0].hmac.should.deep.equal({
      id: client.hmac.id,
      type: client.hmac.type
    });
    inserted.indexed[0].attributes.should.be.an('array');
    inserted.jwe.should.be.an('object');
    inserted.jwe.protected.should.be.a('string');
    inserted.jwe.recipients.should.be.an('array');
    inserted.jwe.recipients.length.should.equal(1);
    isRecipient({recipient: inserted.jwe.recipients[0]});
    inserted.jwe.iv.should.be.a('string');
    inserted.jwe.ciphertext.should.be.a('string');
    inserted.jwe.tag.should.be.a('string');
    inserted.content.should.deep.equal({someKey: 'someValue'});
  });

  it('should insert a document with 5 recipients', async () => {
    const {keyAgreementKey} = mock.keys;
    const client = await mock.createEdv();
    const testId = await EdvClient.generateId();
    const doc = {id: testId, content: {someKey: 'someValue'}};
    // create the did keys then the recipients
    const recipients = (await Promise.all([1, 2, 3, 4]
      .map(createKeyAgreementKey)))
      .map(createRecipient);
    // note: when passing recipients it is important to remember
    // to pass in the document creator. EdvClient will use the
    // EdvOwner by default as a recipient if there are no recipients
    // being passed in, but will not if you explicitly pass in recipients.
    recipients.unshift({header: {kid: keyAgreementKey.id, alg: JWE_ALG}});
    const inserted = await client.insert(
      {keyResolver, invocationSigner, doc, recipients});
    should.exist(inserted);
    inserted.should.be.an('object');
    inserted.id.should.equal(testId);
    inserted.sequence.should.equal(0);
    inserted.indexed.should.be.an('array');
    inserted.indexed.length.should.equal(1);
    inserted.indexed[0].should.be.an('object');
    inserted.indexed[0].sequence.should.equal(0);
    inserted.indexed[0].hmac.should.be.an('object');
    inserted.indexed[0].hmac.should.deep.equal({
      id: client.hmac.id,
      type: client.hmac.type
    });
    inserted.indexed[0].attributes.should.be.an('array');
    inserted.jwe.should.be.an('object');
    inserted.jwe.protected.should.be.a('string');
    inserted.jwe.recipients.should.be.an('array');
    // we should have 5 recipients including the EDV owner.
    inserted.jwe.recipients.length.should.equal(5);
    inserted.jwe.iv.should.be.a('string');
    inserted.jwe.ciphertext.should.be.a('string');
    inserted.jwe.tag.should.be.a('string');
    inserted.content.should.deep.equal({someKey: 'someValue'});
    inserted.jwe.recipients.forEach((recipient, index) => {
      const expected = recipients[index].header;
      // the curve should a 25519 curve
      expected.crv = 'X25519';
      // key type should be Octet Key Pair
      expected.kty = 'OKP';
      // recipient should be JOSE
      // @see https://tools.ietf.org/html/rfc8037
      isRecipient({recipient, expected});
    });
  });

  it('should enable a capability for a recipient', async function() {
    const {keyAgreementKey} = mock.keys;
    const client = await mock.createEdv();
    const testId = await EdvClient.generateId();
    const doc = {id: testId, content: {someKey: 'someValue'}};
    const didKeys = await Promise.all([1].map(createKeyAgreementKey));
    const recipients = didKeys.map(createRecipient);
    // note: when passing recipients it is important to remember
    // to pass in the document creator. EdvClient will use the
    // EdvOwner by default as a recipient if there are no recipients
    // being passed in, but will not if you explicitly pass in recipients.
    recipients.unshift({header: {kid: keyAgreementKey.id, alg: JWE_ALG}});
    const inserted = await client.insert(
      {keyResolver, invocationSigner, doc, recipients});
    should.exist(inserted);
    inserted.should.be.an('object');
    inserted.id.should.equal(testId);
    inserted.sequence.should.equal(0);
    inserted.indexed.should.be.an('array');
    inserted.indexed.length.should.equal(1);
    inserted.indexed[0].should.be.an('object');
    inserted.indexed[0].sequence.should.equal(0);
    inserted.indexed[0].hmac.should.be.an('object');
    inserted.indexed[0].hmac.should.deep.equal({
      id: client.hmac.id,
      type: client.hmac.type
    });
    inserted.indexed[0].attributes.should.be.an('array');
    inserted.jwe.should.be.an('object');
    inserted.jwe.protected.should.be.a('string');
    inserted.jwe.recipients.should.be.an('array');
    // we should have 5 recipients including the EDV owner.
    inserted.jwe.recipients.length.should.equal(2);
    inserted.jwe.iv.should.be.a('string');
    inserted.jwe.ciphertext.should.be.a('string');
    inserted.jwe.tag.should.be.a('string');
    inserted.content.should.deep.equal({someKey: 'someValue'});
    inserted.jwe.recipients.forEach((recipient, index) => {
      const expected = recipients[index].header;
      // the curve should a 25519 curve
      expected.crv = 'X25519';
      // key type should be Octet Key Pair
      expected.kty = 'OKP';
      // recipient should be JOSE
      // @see https://tools.ietf.org/html/rfc8037
      isRecipient({recipient, expected});
    });
    const unsignedCapability = {
      id: `did:zcap:${uuid()}`,
      invocationTarget: `${client.id}/documents/${inserted.id}`,
      '@context': SECURITY_CONTEXT_V2_URL,
      // the invoker is not the creator of the document
      invoker: didKeys[0],
      // the invoker will only be allowed to read the document
      // no write access
      allowedAction: 'read',
      // this will be the zCap of the document
      parentCapability: `${client.id}/zcaps/documents/${inserted.id}`
    };
    console.log('keys', didKeys[0]);
    // this is a little confusing but this is the private key
    // of the EDV owner.
    const signer = mock.invocationSigner;
    const {documentLoader} = mock;
    const suite = new Ed25519Signature2018(
      {signer, verificationMethod: signer.id});
    const purpose = new CapabilityDelegation(
      {capabilityChain: [unsignedCapability.parentCapability]});
    const capabilityToEnable = await sign(
      unsignedCapability, {documentLoader, suite, purpose});
    const result = await client.enableCapability({capabilityToEnable});
    console.log('result', result);
  });

});
