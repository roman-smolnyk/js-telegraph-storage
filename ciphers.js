/**
 * Dumb Cipher (no encryption)
 * @class
 * @implements {BaseCipher}
 */
class DumbCipher extends BaseCipher {
  encrypt(data) {
    return data;
  }

  decrypt(data) {
    return data;
  }
}

/**
 * Base64 Cipher (encoding only)
 * @class
 * @implements {BaseCipher}
 */
class Base64Cipher extends BaseCipher {
  encrypt(str) {
    return btoa(new TextEncoder().encode(str).reduce((data, byte) => data + String.fromCharCode(byte), ""));
  }

  decrypt(base64Data) {
    return new TextDecoder().decode(Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)));
  }
}

class AESCrypto {
  constructor(password) {
    this.password = password;
  }

  async getKey(salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(this.password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async encrypt(text) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16)); // Unique salt
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Unique IV
    const key = await this.getKey(salt);

    const enc = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));

    // Convert everything to Base64 for easy transmission
    return btoa(
      JSON.stringify({
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv)),
        salt: btoa(String.fromCharCode(...salt)),
      })
    );
  }

  async decrypt(encryptedString) {
    const decoded = JSON.parse(atob(encryptedString)); // Decode JSON from Base64

    const salt = new Uint8Array(
      atob(decoded.salt)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const iv = new Uint8Array(
      atob(decoded.iv)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const ciphertext = new Uint8Array(
      atob(decoded.ciphertext)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    const key = await this.getKey(salt);
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

    return new TextDecoder().decode(decrypted);
  }
}

// Example Usage (Simulating Sending to Another User)
(async () => {
  const password = "sharedSecret"; // Both users use the same password
  const sender = new AESCrypto(password);
  const receiver = new AESCrypto(password);

  const encryptedData = await sender.encrypt("Hello, secure world! ".repeat(50));
  console.log("Encrypted Data:", encryptedData.length, encryptedData);

  const decryptedText = await receiver.decrypt(encryptedData);
  console.log("Decrypted Text:", decryptedText.length, decryptedText);
})();
