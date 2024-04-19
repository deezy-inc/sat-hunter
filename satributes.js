const INSCRIPTION_BASE_URL = 'https://ordinals.com/sat'
const emojis_by_rarity = {
    legendary: '🤯🤯🤯🤯🤯🤯🤯',
    epic: '💫⭐✨💫⭐✨💫⭐✨💫⭐✨',
    rare: '💍🔥💍🔥💍🔥💍',
    uncommon: '💎',
    black_uncommon: '♠️',
    black_rare: '🖤💍',
    omega: '🅾️',
    alpha: '🅰️',
    pizza: '🍕',
    prime: '🔱',
    palindrome: '♊',
    vintage: '🍷',
    vintage_nakamoto: '🍷🧘🏽',
    block_9: '9️⃣',
    'block 9': '9️⃣',
    block_78: '7️⃣8️⃣',
    'block 78': '7️⃣8️⃣',
    block_666: '👹',
    digits_palindrome: '♊',
    name_palindrome: '♏',
    halfinney: '👨🏻',
    inscription: '🖼',
    special_name: '🔤',
    2009: '0️⃣9️⃣',
    '450x': '⁴⁵⁰ˣ',
}
const first_2010_sat = 162450000000000
const first_450x_sat = 45000000000
const last_450x_sat = 45100000000

function generate_satributes_messages(satributes, runes = []) {
    if (satributes.length === 0) return ['No special sats found on this utxo']
    const messages = [`Found ${satributes.length} special sats:`]
    for (const satribute of satributes) {
        let msg = ''
        let is_chunkly = false
        if (satribute.sat_number < first_2010_sat) {
            msg += `${emojis_by_rarity['2009']} `
        }
        if (satribute.sat_number < last_450x_sat && satribute.sat_number >= first_450x_sat) {
            msg += `${emojis_by_rarity['450x']} `
        }
        for (const rarity of satribute.rarity_tags) {
            msg += `${emojis_by_rarity[rarity] || ''} `
        }
        for (const rarity of satribute.rarity_tags) {
            msg += `${rarity} `
            if (['block_9', 'block_78', 'pizza'].includes(rarity)) {
                is_chunkly = true
            }
        }
        for (const inscription_group of satribute.inscriptions || []) {
            msg += `\ncollection: ${inscription_group}`
            msg += `\n${INSCRIPTION_BASE_URL}/${satribute.sat_number}`
        }
        msg += `\n#${satribute.sat_number}${satribute.name ? `\nname: ${satribute.name}` : ''}${satribute.timestamp ? `\n${satribute.timestamp.split('T')[0]}` : ''}`
        if (satribute.size > 1 || is_chunkly) {
            msg += `\nsize: ${satribute.size}`
        }
        messages.push(msg)
    }
    for (const rune of runes) {
        let msg = 'Rune:'
        msg += `\n${rune.symbol} ${rune.name ? `\nname: ${rune.name}` : ''}`
        msg += `\namount: ${rune.amount}`
        msg += `\ndivisibility: ${rune.divisibility}`
        messages.push(msg)
    }
    return messages
}

module.exports = {
    generate_satributes_messages,
}
