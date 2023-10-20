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
    "halfinney": "👨🏻"
}

function generate_satributes_message(satributes) {
    if (satributes.length === 0) return `No special sats found on this utxo`
    let msg = `Found ${satributes.length} special sats:`
    for (const satribute of satributes) {
        msg += `\n\n${satribute.sat_number}\n`
        for (const rarity of satribute.rarity_tags) {
            msg += `${emojis_by_rarity[rarity] || ''} `
        }
        for (const rarity of satribute.rarity_tags) {
            msg += `${rarity.replaceAll('_', ' ')} `
        }
    }
    return msg
}

module.exports = {
    generate_satributes_message
}