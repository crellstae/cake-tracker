# Cake-Tracker
## Before to run

Add this file in the root path `config.json` with this content:

```
{
  "main": {
    "preferredNotification": "telegram",
    "stopLoss": 3.5,
    "takeProfit": 3.5,
    "alerts": {
      "buyPriceEqualOrMinorThan": 370.0,
      "sellPriceEqualOrMayorThan": 400.0
    }
  },
  "mailer": {
    "from": "",
    "auth": {
      "user": "",
      "pass": ""
    },
    "security": {
      "host": "",
      "ssl": false,
      "port": 587
    }
  },
  "mail": {
    "recipients": "urabemoon@gmail.com",
    "templates": {
      "stopLoss": {
        "subject": "Notificación de Stop-Loss: $#FiatPerdidas#",
        "body": "<p>Stop-Loss: #StopLoss#%<br />MXN Tarifa $: #MXNTarifa#<br />MXN Perdidas $: #FiatPerdidas#</p>"
      },
      "takeProfit": {
        "subject": "Notificación de Take-Profit: $#FiatGanancias#",
        "body": "<p>Take-Profit: #TakeProfit#%<br />MXN Tarifa $: #MXNTarifa#<br />MXN Gananacias $: #FiatGanancias#</p>"
      },
      "staking": {
        "subject": "Notificación de Staking: $#FiatGanancias#"
      },
      "alertBuy": {
        "subject": "Alerta de Precio de Compra: $#FiatPrecio#",
        "body": "<p>MXN Precio $: #FiatPrecio#<br />Stable-Token Precio: #StablePrice#</p>"
      },
      "alertSell": {
        "subject": "Alerta de Precio de Venta: $#FiatPrecio#",
        "body": "<p>MXN Precio $: #FiatPrecio#<br />Stable-Token: #StablePrice#<br />"
      }
    }
  },
  "telegram": {
    "token": "",
    "channel": ""
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
