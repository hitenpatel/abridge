import Redis from "ioredis";
import { logger } from "./logger";

// Redis client singleton
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
	// Only initialize if REDIS_URL is provided
	const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

	try {
		if (!redis) {
			redis = new Redis(redisUrl, {
				maxRetriesPerRequest: 3,
				retryStrategy: (times) => {
					if (times > 3) {
						logger.warn("Redis connection failed after 3 retries, disabling cache");
						return null; // Stop retrying
					}
					return Math.min(times * 100, 2000);
				},
				lazyConnect: true,
			});

			redis.on("error", (err) => {
				logger.error("Redis error", err);
			});

			redis.on("connect", () => {
				logger.info("Redis connected successfully");
			});

			// Test connection
			redis.connect().catch((err) => {
				logger.warn("Redis not available, running without cache", { error: err.message });
				redis = null;
			});
		}
		return redis;
	} catch (err) {
		logger.warn("Failed to initialize Redis", { error: (err as Error).message });
		return null;
	}
}

// Staff cache key builder
export const staffCacheKey = (userId: string, schoolId?: string) => {
	if (schoolId) {
		return `staff:${userId}:${schoolId}`;
	}
	return `staff:${userId}:all`;
};

// Cache TTL: 10 minutes
export const STAFF_CACHE_TTL = 600;

// Staff membership type
type StaffMembership = {
	schoolId: string;
	role: string;
} | null;

// Staff cache helpers
export async function getCachedStaffMembership(
	userId: string,
	schoolId?: string,
): Promise<StaffMembership | StaffMembership[] | null> {
	const client = getRedisClient();
	if (!client) return null;

	try {
		const key = staffCacheKey(userId, schoolId);
		const cached = await client.get(key);
		if (cached) {
			return JSON.parse(cached) as StaffMembership | StaffMembership[];
		}
	} catch (err) {
		logger.error("Redis get error", err as Error);
	}
	return null;
}

export async function setCachedStaffMembership(
	userId: string,
	data: StaffMembership | StaffMembership[],
	schoolId?: string,
): Promise<void> {
	const client = getRedisClient();
	if (!client) return;

	try {
		const key = staffCacheKey(userId, schoolId);
		await client.setex(key, STAFF_CACHE_TTL, JSON.stringify(data));
	} catch (err) {
		logger.error("Redis set error", err as Error);
	}
}

export async function invalidateStaffCache(userId: string, schoolId?: string): Promise<void> {
	const client = getRedisClient();
	if (!client) return;

	try {
		if (schoolId) {
			// Invalidate specific school cache
			await client.del(staffCacheKey(userId, schoolId));
		}
		// Always invalidate the "all" cache
		await client.del(staffCacheKey(userId));
	} catch (err) {
		logger.error("Redis delete error", err as Error);
	}
}
