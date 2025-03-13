// This is a helper script to validate your private key format
// Run it with: npx tsx scripts/validate-key.ts

function validatePrivateKey() {
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY

  if (!key) {
    console.error("❌ GOOGLE_SHEETS_PRIVATE_KEY is not set")
    return
  }

  console.log("🔍 Analyzing private key format...")
  console.log("Key length:", key.length)
  console.log("Contains \\n:", key.includes("\\n"))
  console.log("Contains actual newlines:", key.includes("\n"))
  console.log("Contains BEGIN marker:", key.includes("-----BEGIN PRIVATE KEY-----"))
  console.log("Contains END marker:", key.includes("-----END PRIVATE KEY-----"))

  try {
    // Try base64 decode
    const decoded = Buffer.from(key, "base64").toString()
    console.log("✅ Key can be decoded as base64")
    console.log("Decoded length:", decoded.length)
  } catch {
    console.log("❌ Key is not base64 encoded")
  }
}

validatePrivateKey()

