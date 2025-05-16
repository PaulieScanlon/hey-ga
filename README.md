# hey-ga

Google Analytics Agent | A [Mastra Hackathon](https://mastra.ai/hackathon) project

This Agent can be used to query Google Analytics data using natural language, for example:

> Show me site visits for the last 30 days?
> Where in the world do my visitors come from?
> What referrers drive traffic to my site?

The Agent will response with a helpful list of answers.

## Getting started

This project uses OpenAI [gpt-40-mini](https://platform.openai.com/docs/models/gpt-4o-mini) and The [Google Analytics Data: Node.js Client](https://www.npmjs.com/package/@google-analytics/data).

### Setup

You'll need x3 environment variables to use this Agent.

1. `OPENAI_API_KEY`
2. `GA4_PROPERTY_ID`
3. `GOOGLE_APPLICATION_CREDENTIALS_BASE64`

Start by running the below, then add you API and property keys

```bash
cp .env.example .env.development
```

Creating `GOOGLE_APPLICATION_CREDENTIALS_BASE64` is a custom solution: You can read more about how and why here: [How to Use Google Application .json Credentials in Environment Variables](https://www.paulie.dev/posts/2024/06/how-to-use-google-application-json-credentials-in-environment-variables/)

### Local Development

With environment variables in place, install the dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Visit the Mastra Playground in your browser:

- [http://localhost:4111/](http://localhost:4111)
