const { get_address_from_hsm, sign_message_with_hsm } = require('../hsm')

// console.log('HSM addr:', get_address_from_hsm())
console.log('Signing message:', sign_message_with_hsm('hello'))
