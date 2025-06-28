# Clickflow Bug Hunter Backend

This backend provides a basic clickable bug analysis API using Puppeteer and Express.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the server (development):
   ```bash
   npx ts-node src/server.ts
   ```
   Or, if you have ts-node-dev:
   ```bash
   npx ts-node-dev src/server.ts
   ```

## API Usage

### Analyze Clickable Bugs

**POST** `/api/analysis/clickable-bugs`

**Body:**

```json
{
  "url": "https://example.com"
}
```

**Response:**

```json
{
  "bugs": [
    {
      "selector": "<button class=\"btn\">...</button>",
      "elementType": "button",
      "textContent": "",
      "bugType": "MissingText",
      "description": "Clickable element has no visible text."
    },
    ...
  ]
}
```
