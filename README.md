# Automated Sat Hunter
Automated script to hunt for rare sats.

[![codecov](https://codecov.io/gh/deezy-inc/sat-hunter/graph/badge.svg?token=Z6LUE3D7FQ)](https://codecov.io/gh/deezy-inc/sat-hunter)

## Requirements
- An account on one of the supported exchanges (see [Exchanges section](https://github.com/deezy-inc/sat-hunter#exchanges))
- Deezy API Token (email support@deezy.io to request one)
- Some Bitcoin

### Warning - Contact the Exchange
Contact the exchange you're using before running the operation. Sat hunting looks very suspicious to the risk department of bitcoin exchanges, so it is important
that you pre-emptively reach out to them and let them know what you're doing so your account does not get banned. All
it takes is emailing support saying: "Hello, I am going to do rare sat hunting on your platform which involves
withdrawing and depositing a high volume of the same coins over and over again. The activity may look suspicious so I
wanted to flag it for you ahead of time. Rare sats are a new phenomenon on bitcoin and the ordinals protocol, and I am
sifting through a large volume of coins in order to find them. Please reach out with any questions. The operation will
be mutually beneficial because I will be paying a lot of withdrawal fees on your platform. Thank you!"

# No-Code Option - Replit:
[Follow This Guide](https://docs.google.com/document/d/17Psk_fY-mhDJ9oVYz2OwbMT1CjCvdOk6Ugqpf0-y_ds/edit#heading=h.a0btlgclkz18) to set up the automated hunter without touching any code

# Self Hosted Option - Run on your own server:

## Overview
The self hosted option requires you to run either of the following:
- Local wallet (e.g. Sparrow): You can use whichever wallet you want as long as you can find your wallet seed, derivation path, and a wallet address (see .env.sample). We strongly recommend Sparrow. See below for Sparrow setup instructions.
- Bitcoin Core: For those not familiar, this is not as intimidating as it sounds. This does NOT mean you need to start a mining operation. See Bitcoin Core section below for more info


## Setup
Install the Script
```agsl
git clone https://github.com/deezy-inc/sat-hunter.git
cd sat-hunter
npm install
```

Setup Environment Variables (you'll need to do some setup for the exchange you're using like getting API keys and allowlisting the withdrawal address)
```agsl
cp .env.example .env
// Edit .env to match your setup.
```



## Usage
```agsl
npm start
```

## Sparrow
We recommend using Sparrow unless you're running an instance of Bitcoin Core. For security purposes we recommend creating a new wallet for sat hunting even if you already use Sparrow for other activities.
1) Download Sparrow from https://sparrowwallet.com/download/
2) Open Sparrow, click File, New Wallet.
3) Name your wallet, click Create Vault
4) Native Segwit is the default script type – use this option.
5) Click New or Imported Software Wallet
6) From the dropdown menu select Use 12 Words
7) Generate new
8) Write down these words in a safe place. You will need the seed words for .env file configuration.
9) Create Keystore -> Import Keystore -> Apply
10) The tabs on the left will turn blue.
11) Go to the receive tab. You will need this address for .env file configuration.


## Telegram Bot
Setting up the telegram bot can give you real-time updates of your operation. Follow these instructions:
1) Message @botfather on telegram with the command `/newbot` and answer the questions
2) After the bot is created @botfather will give you an API key that looks something like this: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`
3) Paste that API key into your `.env` file as `TELEGRAM_BOT_TOKEN` like this (`TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`) (Or as a Secret if using Replit)
4) Run the command `npm run setup-telegram` and leave the terminal window open
5) Message your bot on telegram (the botfather will have given you a t.me/yourbotname link)
6) When your message goes through, your terminal window will show a TELEGRAM_CHAT_ID, add this to your `.env` (or Replit Secret) as well

# Exchanges
Note: see .env.sample for the fields you'll need for each exchange.

## Kraken
Kraken is well-tested and works well. You can email kraken support to get increased daily limits.

## Gemini
Gemini is also well tested and works well, but adding a new withdrawal address requires a 7-day waiting period.

## Bitfinex
Make sure you are NOT a US user and are prepared to KYC. API withdrawals without manual approval require some waiting: you need to enable 2fa and withdrawal address whitelisting and whitelist your withdrawal address and then wait 5 days.

## Coinbase
Regular Coinbase accounts work OK, but withdrawals are often delayed and require additional KYC. Ideally upgrade to Coinbase Exchange for a better experience (below)

## Coinbase Exchange
This is the upgraded version of Coinbase with more support for automation. This account type is recommended if you are able to get the upgrade.

## Coinbase Prime
This is another type of coinbase account

## Binance
Binance should work but is not yet well-tested

## Bybit
Bybit should work but they are known to shotgun-KYC (let you do a little activity then hold your funds unless your provide full KYC), so ensure that you are able to fully KYC according to their regulations

## OKX / OKCoin
Works ok - kind of slow withdrawals from them.

## Kucoin
Newly added

## MORE!!
Help us add more exchanges - we want to add them all! Open an Issue in the Github to request a new one.



## Bitcoin Core
