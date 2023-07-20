export function getBufferCopy(buffer) {
  const bufferCopy = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(bufferCopy).set(new Uint8Array(buffer))
  return bufferCopy
}

export function getTruncatedText(text, maxLength) {
  if (text.length > maxLength) {
    return text.substring(0, maxLength - 3) + '...'
  }
  return text
}
