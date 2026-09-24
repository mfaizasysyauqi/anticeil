declare module 'tweetsodium' {
  const sodium: {
    seal(message: Uint8Array, recipientPublicKey: Uint8Array): Uint8Array
  }
  export default sodium
}
