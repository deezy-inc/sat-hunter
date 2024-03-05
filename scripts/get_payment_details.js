const { get_payment_details } = require('./../commands')

get_payment_details()
    .then(({ payment_details, payment_address }) => {
        console.log(payment_details + payment_address)
    })
    .catch((err) => {
        console.error(err)
    })
