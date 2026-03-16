/**
 * Generates a valid 64-char hex encryption key and writes it directly 
 * into .env.local — no copy/paste, no terminal output parsing.
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
let content = fs.readFileSync(envPath, 'utf8')

// Generate a fresh, guaranteed-correct 32-byte key
const newKey = crypto.randomBytes(32).toString('hex')

// Sanity check
if (newKey.length !== 64) {
    console.error('ERROR: Generated key is not 64 chars! Got:', newKey.length)
    process.exit(1)
}

console.log('Generated key length:', newKey.length, '✓')

// Replace the FIELD_ENCRYPTION_KEY line (handles any existing value)
content = content.replace(
    /^FIELD_ENCRYPTION_KEY=.*$/m,
    `FIELD_ENCRYPTION_KEY=${newKey}`
)

// Add DEV_SERVICE_ROLE=true if not already present
if (!content.includes('DEV_SERVICE_ROLE')) {
    content = content.trimEnd() + '\n\n# Bypass RLS for in-house use\nDEV_SERVICE_ROLE=true\n'
} else {
    // Make sure it's set to true
    content = content.replace(/^DEV_SERVICE_ROLE=.*$/m, 'DEV_SERVICE_ROLE=true')
}

// Fix APP_URL port
content = content.replace(
    /^NEXT_PUBLIC_APP_URL=.*$/m,
    'NEXT_PUBLIC_APP_URL=http://localhost:3003'
)

fs.writeFileSync(envPath, content, 'utf8')
console.log('.env.local updated successfully!')
console.log('New key (first 8 chars):', newKey.substring(0, 8) + '...')

// Verify the written file
const written = fs.readFileSync(envPath, 'utf8')
const match = written.match(/^FIELD_ENCRYPTION_KEY=(.+)$/m)
if (match && match[1].length === 64) {
    console.log('✅ Key verified in file: 64 chars')
} else {
    console.error('❌ Key verification failed! Length:', match?.[1]?.length)
    process.exit(1)
}
