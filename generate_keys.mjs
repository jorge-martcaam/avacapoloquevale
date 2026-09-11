import forge from 'node-forge';
import fs from 'fs';

console.log('Xerando claves RSA e certificado (2048 bits)...');

// Generate key pair
forge.pki.rsa.generateKeyPair({bits: 2048, workers: -1}, function(err, keypair) {
  if(err) {
    console.error(err);
    process.exit(1);
  }
  
  // Create certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
  const attrs = [{
    name: 'commonName',
    value: 'www.example.com'
  }, {
    name: 'countryName',
    value: 'ES'
  }, {
    shortName: 'ST',
    value: 'Galicia'
  }, {
    name: 'localityName',
    value: 'A Coruña'
  }, {
    name: 'organizationName',
    value: 'AI Studio App'
  }, {
    shortName: 'OU',
    value: 'Test'
  }];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  
  // Self-sign certificate
  cert.sign(keypair.privateKey);
  
  // Convert to PEM
  const pemCert = forge.pki.certificateToPem(cert);
  const pemKey = forge.pki.privateKeyToPem(keypair.privateKey);
  
  // Save to files
  fs.writeFileSync('public.pem', pemCert);
  fs.writeFileSync('private.key', pemKey);
  
  console.log('✅ Claves xeradas con éxito!');
  console.log('-> public.pem (O que tes que subir a Enable Banking)');
  console.log('-> private.key (O que tes que por na variable ENABLEBANKING_PRIVATE_KEY)');
});
