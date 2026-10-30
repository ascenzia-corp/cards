/** Certificats auto-signés de test : la chaîne n'est pas Apple, mais la structure de signature est réelle. */
import forge from "node-forge";

function makeCert(
  cn: string,
  keys: forge.pki.rsa.KeyPair,
  issuer?: { cert: forge.pki.Certificate; keys: forge.pki.rsa.KeyPair },
) {
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = String(Math.floor(Math.random() * 1e9));
  cert.validity.notBefore = new Date(Date.now() - 86_400_000);
  cert.validity.notAfter = new Date(Date.now() + 365 * 86_400_000);
  const attrs = [{ name: "commonName", value: cn }];
  cert.setSubject(attrs);
  cert.setIssuer(issuer ? issuer.cert.subject.attributes : attrs);
  cert.sign((issuer ?? { keys }).keys.privateKey, forge.md.sha256.create());
  return cert;
}

export function makeTestCertificates() {
  const caKeys = forge.pki.rsa.generateKeyPair(2048);
  const ca = makeCert("Test WWDR", caKeys);
  const signerKeys = forge.pki.rsa.generateKeyPair(2048);
  const signer = makeCert("Pass Type ID: pass.ai.ascenzia.cards", signerKeys, {
    cert: ca,
    keys: caKeys,
  });
  return {
    wwdr: forge.pki.certificateToPem(ca),
    signerCert: forge.pki.certificateToPem(signer),
    signerKey: forge.pki.privateKeyToPem(signerKeys.privateKey),
    notAfter: signer.validity.notAfter,
  };
}
