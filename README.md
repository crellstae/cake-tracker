# Cake-Tracker
## Before to run

Add this file in the root path `config.json` with this content:

```
{
  "main": {
    "stopLoss": 3.5,
    "takeProfit": 3.5,
    "alerts": {
      "buyPriceEqualOrMinorThan": 250.0,
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
    "token": "2130280103:AAFpROckv5Fll8Loj9EXXwKEpDVGkkPHy68",
    "channel": "-1001737630950",
    "templates": {
      "stopLoss": {
        "title": "<strong>STOP-LOSS</strong>\r\n\r\n",
        "message": [
          "Porcentaje %: <strong>#StopLoss#</strong>\r\n",
          "MXN Tarifa $: <strong>#MXNTarifa#</strong>\r\n",
          "MXN Perdidas $: <strong>#MXNPerdidas#</strong>"
        ]
      },
      "takeProfit": {
        "title": "<strong>TAKE-PROFIT</strong>\r\n\r\n",
        "message": [
          "Porcentaje %: <strong>#TakeProfit#</strong>\r\n",
          "MXN Tarifa $: <strong>#MXNTarifa#</strong>\r\n",
          "MXN Perdidas $: <strong>#MXNGanancias#</strong>"
        ]
      },
      "alertBuy": {
        "title": "<strong>COMPRA</strong>\r\n\r\n",
        "message": [
          "MXN Precio $: <strong>#FiatPrecio#</strong>\r\n",
          "#StableToken# Precio: <strong>#StablePrecio#</strong>"
        ]
      },
      "alertSell": {
        "title": "<strong>VENTA</strong>\r\n\r\n",
        "message": [
          "MXN Precio $: <strong>#FiatPrecio#</strong>\r\n",
          "#StableToken# Precio: <strong>#StablePrecio#</strong>"
        ]
      },
      "staking": {
        "title": "<strong>Staking</strong>\r\n\r\n",
        "message": [
          "Token: <strong>#TokenName#</strong>\r\n",
          "Ganado: <strong>#TokenProfit#</strong>\r\n",
          "MXN $: <strong>#FiatProfit#</strong>\r\n",
          "APR: <strong>#TokenAPR#</strong>\r\n\r\n"
        ]
      },
      "info": {
        "title": "<strong>INFO</strong>\r\n\r\n",
        "message": [
          "<strong>Compra/Venta</strong>\r\n\r\n",
          "Compra $: <strong>#FiatPrecioCompra#</strong> (#StablePrecioCompra# #StableToken#)\r\n",
          "Venta $: <strong>#FiatPrecioVenta#</strong> (#StablePrecioVenta# #StableToken#)\r\n",
          "\r\n<strong>General</strong>\r\n\r\n",
          "#StableToken# #ProfitStatus#: <strong>#StableTokenProfit#</strong>\r\n",
          "MXN #ProfitStatus# $: <strong>#FiatProfit#</strong>\r\n",
          "MXN Staking $: <strong>#FiatStakingTotal#</strong>\r\n",
          "MXN Staking + #ProfitStatus# $: <strong>#FiatProfitTotal#</strong>"
        ]
      }
    }
  },
  "puppeteer": {
    "selectors": {
      "staking": {
        "navTag": "nav",
        "walletConnectWrapperId": "#walletconnect-wrapper",
        "walletConnectId": "#wallet-connect-walletconnect",
        "loadingClass": "sc-fyGvY fLibQH",
        "poolsTableId": "pools-table"
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
