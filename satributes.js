const INSCRIPTION_BASE_URL = 'https://ord.io'
const emojis_by_rarity = {
    "rare": "💍",
    "uncommon": "💎",
    "black uncommon": "♠️",
    "black rare": "🖤",
    "omega": "🅾️",
    "alpha": "🅰️",
    "prime": "🔱",
    "palindrome": "♊",
    "digits_palindrome": "♊",
    "name_palindrome": "♏",
    "halfinney": "👨🏻",
    "rare_inscription": "🖼",
}

function generate_satributes_messages(satributes) {
    if (satributes.length === 0) return [`No special sats found on this utxo`]
    const messages = [`Found ${satributes.length} special sats:`]
    for (const satribute of satributes) {
        let msg = ''
        for (const rarity of satribute.rarity_tags) {
            msg += `${emojis_by_rarity[rarity] || ''} `
        }
        for (const rarity of satribute.rarity_tags) {
            msg += `${rarity.replaceAll('rare_inscription', 'inscription').replaceAll('_', ' ')} `
        }
        for (const inscription_id of satribute.inscriptions || []) {
            msg += `\n${INSCRIPTION_BASE_URL}/${inscription_id}`
        }
        msg += `\n#${satribute.sat_number}${satribute.name ? `\nName: ${satribute.name}` : ''}${satribute.year ? `Year: ${satribute.year}` : ''}`
        messages.push(msg)
    }
    return messages
}

module.exports = {
    generate_satributes_messages
}