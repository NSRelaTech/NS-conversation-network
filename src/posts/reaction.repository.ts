/**
 * Reaction Repository
 * Data access layer for post reactions
 */

import { Pool } from 'pg';
import { Reaction, ReactionType, ReactionCounts } from './types';

export interface ReactionRepositoryConfig {
  pool: Pool;
}

export class ReactionRepository {
  private pool: Pool;

  constructor(config: ReactionRepositoryConfig) {
    this.pool = config.pool;
  }

  /**
   * Find reaction by user and post
   */
  async findByUserAndPost(
    userId: string,
    postId: string
  ): Promise<Reaction | null> {
    const query = `
      SELECT
        id,
        user_id AS "userId",
        post_id AS "postId",
        type,
        created_at AS "createdAt"
      FROM post_reactions
      WHERE user_id = $1 AND post_id = $2
    `;

    const result = await this.pool.query(query, [userId, postId]);
    if (!result.rows[0]) return null;
    return {
      ...result.rows[0],
      type: result.rows[0].type.toLowerCase(),
    };
  }

  /**
   * Get user's reaction for a post
   */
  async getUserReaction(
    userId: string,
    postId: string
  ): Promise<Reaction | null> {
    return this.findByUserAndPost(userId, postId);
  }

  /**
   * Upsert a reaction (insert or update)
   */
  async upsert(input: {
    userId: string;
    postId: string;
    type: ReactionType;
  }): Promise<Reaction> {
    const dbType = input.type.toUpperCase();
    const query = `
      INSERT INTO post_reactions (post_id, user_id, type)
      VALUES ($2, $1, $3::"ReactionType")
      ON CONFLICT (post_id, user_id)
      DO UPDATE SET type = EXCLUDED.type
      RETURNING
        id,
        user_id AS "userId",
        post_id AS "postId",
        type,
        created_at AS "createdAt"
    `;

    const result = await this.pool.query(query, [
      input.userId,
      input.postId,
      dbType,
    ]);
    return {
      ...result.rows[0],
      type: result.rows[0].type.toLowerCase(),
    };
  }

  /**
   * Delete a reaction
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM post_reactions WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get reaction counts for a post
   */
  async getReactionCounts(postId: string): Promise<ReactionCounts> {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'LIKE' THEN 1 ELSE 0 END), 0) AS like,
        COALESCE(SUM(CASE WHEN type = 'LOVE' THEN 1 ELSE 0 END), 0) AS love,
        COALESCE(SUM(CASE WHEN type = 'HAHA' THEN 1 ELSE 0 END), 0) AS laugh,
        COALESCE(SUM(CASE WHEN type = 'WOW' THEN 1 ELSE 0 END), 0) AS wow,
        COALESCE(SUM(CASE WHEN type = 'SAD' THEN 1 ELSE 0 END), 0) AS sad,
        COALESCE(SUM(CASE WHEN type = 'ANGRY' THEN 1 ELSE 0 END), 0) AS angry,
        COUNT(*) AS total
      FROM post_reactions
      WHERE post_id = $1
    `;

    const result = await this.pool.query(query, [postId]);
    const row = result.rows[0];

    return {
      like: parseInt(row.like, 10),
      love: parseInt(row.love, 10),
      laugh: parseInt(row.laugh, 10),
      wow: parseInt(row.wow, 10),
      sad: parseInt(row.sad, 10),
      angry: parseInt(row.angry, 10),
      total: parseInt(row.total, 10),
    };
  }

  /**
   * Get reactions for a post with pagination
   */
  async getReactionsForPost(
    postId: string,
    type?: ReactionType,
    limit: number = 20,
    offset: number = 0
  ): Promise<Reaction[]> {
    let query = `
      SELECT
        id,
        user_id AS "userId",
        post_id AS "postId",
        type,
        created_at AS "createdAt"
      FROM post_reactions
      WHERE post_id = $1
    `;

    const values: unknown[] = [postId];

    if (type) {
      query += ` AND type = $2::"ReactionType"`;
      values.push(type.toUpperCase());
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows.map((row) => ({
      ...row,
      type: row.type.toLowerCase(),
    }));
  }
}
