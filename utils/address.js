function get_address_by_name() {
    const configured_address_book = process.env.ADDRESS_BOOK
    if (!configured_address_book || configured_address_book.trim() === '') {
        return null
    }
    return configured_address_book
        .trim()
        .split(' ')
        .reduce((acc, pair_name_by_address) => {
            const [name, address] = pair_name_by_address.trim().split(':')
            acc[name] = address
            return acc
        }, {})
}

function get_name_by_address() {
    const configured_address_book = process.env.ADDRESS_BOOK
    if (!configured_address_book || configured_address_book.trim() === '') {
        return null
    }
    return configured_address_book
        .trim()
        .split(' ')
        .reduce((acc, pair_name_by_address) => {
            const [name, address] = pair_name_by_address.trim().split(':')
            acc[address] = name
            return acc
        }, {})
}

module.exports = {
    get_address_by_name,
    get_name_by_address,
}
