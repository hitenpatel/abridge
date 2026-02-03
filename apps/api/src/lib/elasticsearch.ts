import { Client } from "@elastic/elasticsearch";

const elasticsearchUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";

export const elasticsearchClient = new Client({
	node: elasticsearchUrl,
	requestTimeout: 5000,
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
