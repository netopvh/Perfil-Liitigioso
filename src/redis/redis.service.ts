import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private enabled: boolean = true;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get('REDIS_HOST', 'localhost');
    const port = this.config.get('REDIS_PORT', 6379);
    const password = this.config.get('REDIS_PASSWORD') || undefined;
    try {
      this.client = new Redis({
        host,
        port: Number(port),
        password: password || undefined,
        maxRetriesPerRequest: 2,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      await this.client.connect();
    } catch {
      this.enabled = false;
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttlSeconds, serialized);
    } catch {
      // ignore
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // ignore
    }
  }
}
