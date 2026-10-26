# Illumea Skin Care (illumea.lk)

The storefront for **ILLUMEA SKIN CARE** (Sansu International Pvt Ltd / Dr. Chaminda Malalasekara, Kandy).

The shop runs on **Vertik ERP**. Products, prices, stock, delivery charges, orders and contact
messages all live in Dr. Malalasekara's Vertik account (`dr-malalasekara.vertikworkspace.com`).
This site has no backend of its own: it reads and writes through Vertik's public shop API.

## Where things are managed

| On the website | In Vertik |
|---|---|
| Products, prices, pictures, stock | Items, published to the web shop |
| Categories on the Shop page | The items' web shop categories |
| Delivery charge at checkout | Shipping zones (area, weight, free-delivery threshold) |
| Orders placed on the site | Web Orders |
| Contact form and newsletter signups | Enquiries |

The long product copy (benefits, ingredients, how to use) is kept in `src/data/products.ts` and is
matched to the ERP's product **by name**. Name a product in Vertik exactly as it is named there.

## Run

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` to point the site at another Vertik installation.

## Going live

The site's address must be saved as the **storefront URL** for this client in the Vertik operator
panel, otherwise the browser refuses to read the shop API from it (CORS).
