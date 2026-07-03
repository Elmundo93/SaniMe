import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { documentVersions } from '../../db/schema';

@Injectable()
export class DocumentVersionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(documentId: string, storageKey: string, hash: string, mimeType: string, sizeBytes: number) {
    const [row] = await this.db
      .insert(documentVersions)
      .values({ documentId, storageKey, hash, mimeType, sizeBytes })
      .returning();
    return row;
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(documentVersions).where(eq(documentVersions.id, id)).limit(1);
    return row ?? null;
  }
}
