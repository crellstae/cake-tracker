# Cake-Tracker
## Before to run

Add this file in the root path `config.json` with this content:

```
{
  "saved": {
    "stabledAmount": 0,
    "stopLoss": 3.5,
    "takeProfit": 3.5
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
    "recipients": "",
    "templates": {
      "stopLoss": {
        "subject": "Notificación Stop-Loss: #StopLoss#%",
        "body": "<p>Hola</p><p>Stop-Loss: #StopLoss#%<br />MXN Tarifa: $#MXNTarifa#<br />MXN Perdidas: $#FiatPerdidas#</p>"
      },
      "takeProfit": {
        "subject": "Notificación Take-Profit: #TakeProfit#%",
        "body": "<p>Hola</p><p>Take-Profit: #TakeProfit#%<br />MXN Tarifa: $#MXNTarifa#<br />MXN Gananacias: $#FiatGanancias#</p>"
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