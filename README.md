# 🎅 Santa Ops

**Holiday Gift Orchestration System**

Turn a Notion table into an automated gift pipeline: discover → approve → purchase → personalize.

![Santa Ops Dashboard](https://via.placeholder.com/800x400?text=Santa+Ops+Dashboard)

## ✨ Features

- **Notion-Powered**: Use Notion as your primary UI for managing gifts
- **Smart Discovery**: Scrapes Google Shopping to find the best products within budget
- **Approval Workflow**: Review suggestions in Notion, approve or request alternatives
- **Automated Checkout**: Attempts to place orders via browser automation
- **AI Riddles**: Generates playful 4-line rhyming riddles that hint at gifts
- **Festive Cards**: Creates shareable Gamma cards with riddles

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/santa-ops.git
cd santa-ops
npm install
```

### 2. Set Up Notion

Create a Notion database with these required columns:

| Column Name | Type | Description |
|-------------|------|-------------|
| Name | Title | Recipient name |
| Gift Idea | Text | What to search for |
| Budget | Number | Maximum spend (USD) |

The app will automatically create these columns:
- Product Link (URL)
- Product Image (URL)
- Approval Status (Select: Pending/Approved/Denied)
- Order Status (Select: Not started/Ordered/Manual purchase required/Failed)
- Riddle (Text)
- Card Link (URL)

### 3. Set Up Notion OAuth (Required)

This app uses [Notion MCP](https://developers.notion.com/docs/mcp) with OAuth 2.0 for secure authentication:

1. Go to [My Integrations](https://www.notion.so/my-integrations)
2. Click **+ New integration**
3. Choose **Public** integration type
4. Fill in details:
   - Name: "Santa Ops"
   - Redirect URI: `http://localhost:3000/api/auth/notion/callback`
5. After creation, copy the **Client ID** and **Client Secret**
6. Share your gift database with the integration

### 4. Configure Environment Variables

Create a `.env.local` file:

```bash
# Notion OAuth (PUBLIC integration)
NOTION_CLIENT_ID=your_client_id
NOTION_CLIENT_SECRET=your_client_secret
NOTION_REDIRECT_URI=http://localhost:3000/api/auth/notion/callback

# Notion MCP
NOTION_MCP_URL=https://mcp.notion.com/mcp

# Your database ID (from the Notion database URL)
NOTION_DATABASE_ID=your_database_id

# AI Services
OPENAI_API_KEY=sk-your_openai_key
GAMMA_API_KEY=your_gamma_key
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## 📡 API Endpoints

### POST `/api/orchestrate`

Main orchestration endpoint. Supports different modes:

```json
{ "mode": "discovery" }  // Find products for pending rows
{ "mode": "orders" }     // Process approved orders + generate riddles/cards
{ "mode": "riddles" }    // Generate riddles only
{ "mode": "cards" }      // Generate cards only
{ "mode": "full" }       // Run complete pipeline
```

### POST `/api/discover`

Discover product for a single row:

```json
{ "pageId": "notion-page-id" }
```

### POST `/api/order`

Attempt order for a single row:

```json
{ "pageId": "notion-page-id" }
```

### POST `/api/riddle`

Generate riddle for a single row:

```json
{ "pageId": "notion-page-id" }
```

### POST `/api/card`

Generate Gamma card for a single row:

```json
{ "pageId": "notion-page-id" }
```

### POST `/api/webhook`

Handle approval status changes (for denial retries):

```json
{ "pageId": "notion-page-id", "action": "denied" }
```

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Notion DB     │◄───►│   Notion MCP     │◄───►│   Next.js API   │
│  (User's UI)    │     │   (MCP Server)   │     │   (Vercel)      │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
         ┌────────────────────────┬───────────────────────┤
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Puppeteer       │     │ OpenAI API      │     │ Gamma API       │
│ (Google Shop)   │     │ (Riddles)       │     │ (Cards)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🎯 Workflow

1. **Ingestion**: App reads Notion rows with Name, Gift Idea, Budget
2. **Discovery**: Browser agent searches Google Shopping, finds best product within budget
3. **Suggestion**: Updates Notion with product link, image, sets status to Pending
4. **Review**: User reviews in Notion, sets Approved or Denied
5. **Retry** (if denied): Finds next cheaper alternative
6. **Order** (if approved): Attempts checkout via browser automation
7. **Riddle**: AI generates 4-line rhyming riddle
8. **Card**: Creates festive Gamma card with riddle

## 🔧 Configuration

### Vercel Deployment

The app is configured for Vercel with:
- 60-second function timeout
- 1024MB memory for browser automation
- Serverless Chromium via `@sparticuz/chromium`

Deploy with:

```bash
vercel
```

### Environment Variables for Vercel

Set these in your Vercel project settings:

- `NOTION_CLIENT_ID` - From your Notion public integration
- `NOTION_CLIENT_SECRET` - From your Notion public integration
- `NOTION_REDIRECT_URI` - Your production callback URL (e.g., `https://your-app.vercel.app/api/auth/notion/callback`)
- `NOTION_MCP_URL` - Default: `https://mcp.notion.com/mcp`
- `NOTION_DATABASE_ID` - Your Notion database ID
- `OPENAI_API_KEY` - Your OpenAI API key
- `GAMMA_API_KEY` - Your Gamma API key

## ⚠️ Limitations

- **Single User MVP**: No multi-user support
- **Manual Checkout**: Most sites require manual payment completion
- **Rate Limits**: Google Shopping may rate-limit heavy usage
- **Serverless Timeout**: 60-second limit on Vercel

## 🎄 License

MIT License - See [LICENSE](LICENSE) for details.

---

Built with ❤️ for the holidays
