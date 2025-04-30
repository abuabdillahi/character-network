# CharGraph: Character Network Visualization

CharGraph is a web application that visualizes character relationships in books. By analyzing text from Project Gutenberg, it identifies characters and their interactions, then displays them as an interactive network graph.

Live site: [https://chargraph.abuabdillahi.com](https://chargraph.abuabdillahi.com)

## Features

- **Book Selection**: Enter a Gutenberg book ID or choose from popular titles
- **Character Analysis**: Identifies characters and relationships from book text
- **Interactive Visualization**: D3-powered force-directed graph of character relationships
- **Character Details**: View detailed information about characters and their connections
- **Responsive Design**: Works across desktop and mobile devices

## How It Works

1. **Book Retrieval**: The app fetches book text from Project Gutenberg using the provided ID
2. **Text Analysis**: Using AI, the app processes the text to identify characters and their interactions
3. **Network Creation**: Characters are represented as nodes, with edges between them based on interactions
4. **Interactive UI**: Users can explore the graph, click on nodes to view details, and adjust the visualization

## Technology Stack

### Frontend
- **Next.js**: React framework for server-rendered applications
- **shadcn**: UI components
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Radix UI**: Accessible UI components
- **D3.js**: Data visualization library for the network graph
- **TypeScript**: Type-safe JavaScript

### Backend
- **Next.js API Routes**: Serverless functions for data processing
- **Redis (Upstash)**: Caching book data and analysis results
- **Groq SDK**: AI-powered text analysis

### Deployment
- **Vercel**: Hosting platform with GitHub integration for CI/CD
- **Upstash**: Redis database for caching
- **GitHub**: Source control and automated deployments

## Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/abuabdillahi/character-network.git
cd character-network
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.development` file with necessary environment variables:
```
UPSTASH_REDIS_REST_API_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_API_TOKEN=your-upstash-redis-token
GROQ_API_KEY=your-groq-api-key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## Deployment

The application is deployed to Vercel automatically when commits are pushed to the main branch on GitHub. The Redis database is hosted on Upstash through Vercel integration.

To deploy your own instance:

1. Fork this repository
2. Create a Vercel account and link it to your GitHub
3. Create an Upstash Redis database through Vercel
4. Configure the required environment variables in Vercel
5. Deploy from your GitHub repository

## License

[MIT](LICENSE)
