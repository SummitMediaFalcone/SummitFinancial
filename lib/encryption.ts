/**
 * Field-level encryption using Node.js crypto (AES-256-GCM).
 * Key is loaded from FIELD_ENCRYPTION_KEY env var (32 bytes = 64 hex chars).
 *
 * Usage:
 *   const enc = encryptField("123-45-6789")
 *   const plain = decryptField(enc)
 */

import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // GCM standard
const TAG_LENGTH = 16

function getKey(): Buffer {
    const hex = process.env.FIELD_ENCRYPTION_KEY
    if (!hex || hex.length !== 64) {
        throw new Error(
            "FIELD_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). " +
            "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        )
    }
    return Buffer.from(hex, "hex")
}

/**
 * Encrypt a plaintext string.
 * Returns a base64 string: iv(12) + tag(16) + ciphertext, all concatenated.
 */
export function encryptField(plaintext: string): string {
    const key = getKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ])
    const tag = cipher.getAuthTag()
    // Format: base64(iv + tag + ciphertext)
    return Buffer.concat([iv, tag, encrypted]).toString("base64")
}

/**
 * Decrypt a previously encrypted value.
 * Returns the original plaintext string.
 */
export function decryptField(ciphertext: string): string {
    const key = getKey()
    const data = Buffer.from(ciphertext, "base64")
    const iv = data.subarray(0, IV_LENGTH)
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        iv
    ) as crypto.DecipherGCM
    decipher.setAuthTag(tag)
    return decipher.update(encrypted) + decipher.final("utf8")
}

/**
 * Mask a TIN for display.
 * SSN: "123-45-6789" → "***-**-6789"
 * EIN: "12-3456789"  → "**-***6789"
 */
export function maskTin(tin: string, type: "SSN" | "EIN"): string {
    const digits = tin.replace(/\D/g, "")
    if (type === "SSN" && digits.length === 9) {
        return `***-**-${digits.slice(-4)}`
    }
    if (type === "EIN" && digits.length === 9) {
        return `**-***${digits.slice(-4)}`
    }
    // Fallback: show last 4
    return `****${digits.slice(-4)}`
}

/**
 * Mask a bank routing/account number (show last 4).
 */
export function maskBankNumber(raw: string): string {
    const digits = raw.replace(/\D/g, "")
    return `****${digits.slice(-4)}`
}
