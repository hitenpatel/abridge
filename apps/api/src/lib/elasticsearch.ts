import { Client } from "@elastic/elasticsearch";

const elasticsearchUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";

export const elasticsearchClient = new Client({
	node: elasticsearchUrl,
	requestTimeout: 5000,
	// Override vendored headers to fix v9 client / v8 server compatibility
	// The v9 client sends "compatible-with=9" which ES v8 rejects
	headers: {
		"content-type": "application/json",
		accept: "application/json",
	},
});

// Check connection
elasticsearchClient
	.info()
	.then((response) => {
		console.log(`Connected to Elasticsearch: ${response.name}`);
	})
	.catch((error) => {
		// Don't crash if ES is not available, just log warning
		console.warn("Could not connect to Elasticsearch", error.message);
	});
