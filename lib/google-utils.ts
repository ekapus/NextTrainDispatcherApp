/**
 * Helper function to properly format the private key
 * This handles different formats of private keys including base64 encoded keys
 */
export function formatPrivateKey(key: string): string {
  if (!key) {
    throw new Error("Private key is required")
  }

  // First, try to detect if the key is base64 encoded
  let formattedKey = key
  if (key.indexOf(" ") === -1 && key.indexOf("\n") === -1) {
    try {
      formattedKey = Buffer.from(key, "base64").toString()
    } catch (error) {
      console.error("Failed to decode base64 key, attempting to process as raw key")
    }
  }

  // Clean up the key by removing any existing formatting
  formattedKey = formattedKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, "")
    .trim()

  // Format the key body into 64-character lines
  const keyLines: string[] = []
  for (let i = 0; i < formattedKey.length; i += 64) {
    keyLines.push(formattedKey.slice(i, i + 64))
  }

  // Construct the final PEM format with proper spacing
  const pemKey = ["-----BEGIN PRIVATE KEY-----", ...keyLines, "-----END PRIVATE KEY-----"].join("\n")

  return pemKey
}

