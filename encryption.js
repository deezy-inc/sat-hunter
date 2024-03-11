const crypto = require('crypto')

function getKeyFromPassword(password) {
    return crypto.createHash('sha256').update(password).digest()
}

function encrypt(text, password) {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(getKeyFromPassword(password)), iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(data, password) {
    const [ivHex, encryptedData] = data.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const encryptedText = Buffer.from(encryptedData, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(getKeyFromPassword(password)), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
}

module.exports = { decrypt, encrypt }
