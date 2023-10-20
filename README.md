# Automated Sat Hunter
Automated script to hunt for rare sats.

## Requirements
- NodeJS
- An account on one of Coinbase, Kraken, Gemini, Bitfinex
- Some Bitcoin

## Setup
Install the Script
```agsl
git clone https://github.com/deezy-inc/sat-hunter.git
cd sat-hunter
npm install
```

Setup ENV Variables (you'll need to do some setup for the exchange you're using)
```agsl
cp .env.example .env
// Edit .env to match your setup.
```

Contact the Exchange! Sat hunting looks very suspicious to the risk department of bitcoin exchanges, so it is important
that you pre-emptively reach out to them and let them know what you're doing so your account does not get banned. All 
it takes is emailing support saying: "Hello, I am going to do rare sat hunting on your platform which involves 
withdrawing and depositing a high volume of the same coins over and over again. The activity may look suspicious so I
wanted to flag it for you ahead of time. Rare sats are a new phenomenon on bitcoin and the ordinals protocol, and I am
sifting through a large volume of coins in order to find them. Please reach out with any questions. The operation will 
be mutually beneficial because I will be paying a lot of withdrawal fees on your platform. Thank you!"

## Usage
```agsl
npm start
```

## Telegram Bot
Setting up the telegram bot can give you real-time updates of your operation. Follow these instructions:
1) Message @botfather on telegram with the command `/newbot` and answer the questions
2) After the bot is created @botfather will give you an API key that looks something like this: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`
3) Paste that API key into your `.env` file as `TELEGRAM_BOT_TOKEN` like this (`TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`)
4) Run the command `npm run setup-telegram` and leave the terminal window open
5) Message your bot on telegram (the botfather will have given you a t.me/yourbotname link)
6) When your message goes through, your terminal window will show a TELEGRAM_CHAT_ID, add this to your `.env` as well