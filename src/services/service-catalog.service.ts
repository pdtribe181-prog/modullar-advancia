/**
 * In-Memory Service Catalog - Breathing God's Truth (Glory to Him)
 *
 * Like breathing: Database exhales data, Memory inhales it.
 * Memory exhales to API, API exhales to Frontend.
 * Frontend exhales back, API exhales back to Database.
 *
 * Back and front, front and back - it's ALL God's creation.
 *
 * The truth already exists (God gave us the air).
 * We don't create it, we don't own it, we don't form it.
 * We just circulate what the living God already created.
 *
 * When this works: ALL GLORY TO GOD.
 * When data flows smoothly: ALL HONOR TO GOD.
 * When services are served instantly: ALL PRAISE TO GOD.
 *
 * We serve. He creates. He gets the glory.
 */

import { supabase } from '../lib/supabase.js';
import { logger } from '../middleware/logging.middleware.js';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  code: string | null;
  code_type: string | null;
  default_price: number;
  currency: string;
  duration_minutes: number | null;
  is_active: boolean;
  requires_authorization: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

class ServiceCatalog {
  private services: Map<string, Service> = new Map();
  private categories: Set<string> = new Set();
  private lastSync: Date | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 5 * 60 * 1000; // Sync every 5 minutes

  /**
   * Initialize the catalog - load all services into memory
   */
  async initialize(): Promise<void> {
    logger.info('🔄 Initializing service catalog...');
    await this.loadServices();
    this.startAutoSync();
    logger.info(`✅ Service catalog loaded: ${this.services.size} services in memory`);
  }

  /**
   * Load services from database into memory
   */
  private async loadServices(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        logger.error('Failed to load services from database', error);
        throw error;
      }

      // Clear existing data
      this.services.clear();
      this.categories.clear();

      // Load into memory
      if (data) {
        data.forEach((service: Service) => {
          this.services.set(service.id, service);
          this.categories.add(service.category);
        });
      }

      this.lastSync = new Date();
      logger.info('Service catalog synced', {
        serviceCount: this.services.size,
        categoryCount: this.categories.size,
      });
    } catch (error) {
      logger.error('Failed to load services', error as Error);
      throw error;
    }
  }

  /**
   * Start automatic periodic sync
   */
  private startAutoSync(): void {
    this.syncInterval = setInterval(async () => {
      try {
        await this.loadServices();
      } catch (error) {
        logger.error('Auto-sync failed', error as Error);
      }
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop automatic sync (for graceful shutdown)
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Service catalog auto-sync stopped');
    }
  }

  /**
   * Manually trigger a sync
   */
  async refresh(): Promise<void> {
    await this.loadServices();
  }

  /**
   * Get all active services (from memory)
   */
  getAll(includeInactive = false): Service[] {
    const services = Array.from(this.services.values());
    return includeInactive ? services : services.filter((s) => s.is_active);
  }

  /**
   * Get service by ID (from memory)
   */
  getById(id: string): Service | undefined {
    return this.services.get(id);
  }

  /**
   * Get services by category (from memory)
   */
  getByCategory(category: string, includeInactive = false): Service[] {
    return this.getAll(includeInactive).filter((s) => s.category === category);
  }

  /**
   * Search services by name, description, or code (from memory)
   */
  search(query: string, includeInactive = false): Service[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll(includeInactive).filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description?.toLowerCase().includes(lowerQuery) ||
        s.code?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all unique categories (from memory)
   */
  getCategories(): string[] {
    return Array.from(this.categories).sort();
  }

  /**
   * Get catalog statistics
   */
  getStats() {
    const active = this.getAll(false).length;
    const inactive = this.services.size - active;
    return {
      total: this.services.size,
      active,
      inactive,
      categories: this.categories.size,
      lastSync: this.lastSync?.toISOString(),
      memorySize: this.estimateMemorySize(),
    };
  }

  /**
   * Estimate memory usage in bytes
   */
  private estimateMemorySize(): number {
    const json = JSON.stringify(Array.from(this.services.values()));
    return Buffer.byteLength(json, 'utf8');
  }

  /**
   * Add or update a service in memory (after database update)
   */
  async upsert(service: Service): Promise<void> {
    this.services.set(service.id, service);
    this.categories.add(service.category);
    logger.info('Service upserted in catalog', { id: service.id, name: service.name });
  }

  /**
   * Remove a service from memory
   */
  remove(id: string): void {
    const service = this.services.get(id);
    if (service) {
      this.services.delete(id);
      logger.info('Service removed from catalog', { id, name: service.name });

      // Rebuild categories (in case this was the last service in a category)
      this.categories.clear();
      this.services.forEach((s) => this.categories.add(s.category));
    }
  }
}

// Singleton instance
export const serviceCatalog = new ServiceCatalog();

/**
 * Initialize catalog on module load (called by server.ts)
 */
export async function initializeServiceCatalog(): Promise<void> {
  await serviceCatalog.initialize();
}

/**
 * Graceful shutdown
 */
export function shutdownServiceCatalog(): void {
  serviceCatalog.stopAutoSync();
}
