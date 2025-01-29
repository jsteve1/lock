import { Buffer } from 'buffer';

// Generate a random encryption key
export const generateEncryptionKey = async (): Promise<string> => {
  const key = await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  const exportedKey = await window.crypto.subtle.exportKey('raw', key);
  return Buffer.from(exportedKey).toString('base64');
};

// Import an encryption key from base64
export const importKey = async (keyBase64: string): Promise<CryptoKey> => {
  const keyBuffer = Buffer.from(keyBase64, 'base64');
  return window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );
};

// Encrypt data
export const encrypt = async (data: string, keyBase64: string): Promise<string> => {
  const key = await importKey(keyBase64);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoder.encode(data)
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  return Buffer.from(combined).toString('base64');
};

// Decrypt data
export const decrypt = async (encryptedData: string, keyBase64: string): Promise<string> => {
  const key = await importKey(keyBase64);
  const combined = Buffer.from(encryptedData, 'base64');
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
};

// Encrypt file
export const encryptFile = async (file: File, keyBase64: string): Promise<{ encryptedData: string, contentType: string }> => {
  const key = await importKey(keyBase64);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileData = await file.arrayBuffer();
  
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    fileData
  );
  
  const combined = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  return {
    encryptedData: Buffer.from(combined).toString('base64'),
    contentType: file.type,
  };
};

// Decrypt file
export const decryptFile = async (
  encryptedData: string,
  keyBase64: string,
  contentType: string
): Promise<File> => {
  const key = await importKey(keyBase64);
  const combined = Buffer.from(encryptedData, 'base64');
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );
  
  return new File([decryptedData], 'decrypted-file', { type: contentType });
}; 