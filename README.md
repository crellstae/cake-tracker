# Cake-Tracker
## Before to run

Add this file in the root path `config.json` with this content:

```
{
  "main": {
    "stopLoss": 3.5,
    "takeProfit": 3.5,
    "alerts": {
      "buyPriceEqualOrMinorThan": 370.0,
      "sellPriceEqualOrMayorThan": 400.0
    },
    "notifications": {
      "stopLoss": true,
      "takeProfit": true,
      "staking": true,
      "alerts": true
    }
  },
  "telegram": {
    "token": "",
    "channel": "",
    "templates": {
      "stopLoss": {
        "title": "<strong>STOP-LOSS</strong>\r\n\r\n",
        "message": [
          "<strong>Porcentaje</strong>: #StopLoss#\r\n",
          "<strong>MXN Tarifa</strong>: #MXNTarifa#\r\n",
          "<strong>MXN Perdidas</strong> $: #MXNPerdidas#"
        ]
      },
      "takeProfit": {
        "title": "<strong>TAKE-PROFIT</strong>\r\n\r\n",
        "message": [
          "<strong>Porcentaje</strong>: #TakeProfit#\r\n",
          "<strong>MXN Tarifa</strong>: #MXNTarifa#\r\n",
          "<strong>MXN Perdidas</strong> $: #MXNGanancias#"
        ]
      },
      "staking": {
        "title": "<strong>STAKING</strong>\r\n\r\n",
        "message": [
          "<strong>Token</strong>: #TokenName#\r\n",
          "<strong>Ganado</strong>: #TokenProfit#\r\n",
          "<strong>USD</strong> $: #USDProfit#\r\n",
          "<strong>MXN</strong> $: #FiatProfit#\r\n",
          "<strong>APR</strong>: #TokenAPR#\r\n",
          "<strong>Staked</strong>: #CakeStaked#\r\n\r\n"
        ]
      },
      "alertBuy": {
        "title": "<strong>COMPRA</strong>\r\n\r\n",
        "message": [
          "<strong>MXN Precio</strong> $: #FiatPrecio#\r\n",
          "<strong>Stable-Token Precio</strong> $: #StablePrice#"
        ]
      },
      "alertSell": {
        "title": "<strong>VENTA</strong>\r\n\r\n",
        "message": [
          "<strong>MXN Precio</strong> $: #FiatPrecio#\r\n",
          "<strong>Stable-Token Precio</strong> $: #StablePrice#"
        ]
      }
    }
  }
}
```

NOTE: Please configure the recpients value and mailer section with your smtp server.

## Run

Just need to excute this commands:

```
$ npm install
$ npm start
```

We are working on generate executables.
