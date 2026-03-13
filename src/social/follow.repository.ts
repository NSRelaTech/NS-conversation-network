/**
 * Follow Repository
 * Data access layer for user follow relationships
 */

import { Pool } from 'pg';

export interface FollowRepositoryConfig {
  pool: Pool;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  status: 'active' | 'pending' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

export class FollowRepository {
  private pool: Pool;

  constructor(config: FollowRepositoryConfig) {
    this.pool = config.pool;
  }

  /**
   * Get list of user IDs that a user follows
   */
  async getFollowingIds(userId: string): Promise<string[]> {
    const query = `
      SELECT following_id AS "followingId"
      FROM follows
      WHERE follower_id = $1 AND status = 'ACCEPTED'
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows.map((row) => row.followingId);
  }

  /**
   * Get list of user IDs that follow a user
   */
  async getFollowerIds(userId: string): Promise<string[]> {
    const query = `
      SELECT follower_id AS "followerId"
      FROM follows
      WHERE following_id = $1 AND status = 'ACCEPTED'
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows.map((row) => row.followerId);
  }

  /**
   * Find a follow relationship by follower/following pair
   */
  async findByPair(followerId: string, followingId: string): Promise<Follow | null> {
    const query = `
      SELECT
        id,
        follower_id AS "followerId",
        following_id AS "followingId",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM follows
      WHERE follower_id = $1 AND following_id = $2
      LIMIT 1
    `;

    const result = await this.pool.query(query, [followerId, followingId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      status: row.status === 'ACCEPTED' ? 'active' : row.status.toLowerCase(),
    };
  }

  /**
   * Check if user A follows user B
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM follows
      WHERE follower_id = $1 AND following_id = $2 AND status = 'ACCEPTED'
      LIMIT 1
    `;

    const result = await this.pool.query(query, [followerId, followingId]);
    return result.rows.length > 0;
  }

  /**
   * Create a follow relationship
   * Accepts either positional args or an object
   */
  async create(
    followerIdOrData: string | { followerId: string; followingId: string; status?: string },
    followingIdArg?: string
  ): Promise<Follow> {
    const followerId = typeof followerIdOrData === 'string' ? followerIdOrData : followerIdOrData.followerId;
    const followingId = typeof followerIdOrData === 'string' ? followingIdArg! : followerIdOrData.followingId;
    const query = `
      INSERT INTO follows (follower_id, following_id, status)
      VALUES ($1, $2, 'ACCEPTED')
      ON CONFLICT (follower_id, following_id)
      DO UPDATE SET status = 'ACCEPTED', updated_at = NOW()
      RETURNING
        id,
        follower_id AS "followerId",
        following_id AS "followingId",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    const result = await this.pool.query(query, [followerId, followingId]);
    return { ...result.rows[0], status: 'active' };
  }

  /**
   * Remove a follow relationship by ID or by follower/following pair
   */
  async delete(followerIdOrId: string, followingId?: string): Promise<boolean> {
    let query: string;
    let params: string[];

    if (followingId) {
      query = `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`;
      params = [followerIdOrId, followingId];
    } else {
      query = `DELETE FROM follows WHERE id = $1`;
      params = [followerIdOrId];
    }

    const result = await this.pool.query(query, params);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Update follow status
   */
  async updateStatus(id: string, status: string): Promise<Follow> {
    const dbStatus = status === 'active' ? 'ACCEPTED' : status.toUpperCase();
    const query = `
      UPDATE follows SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        follower_id AS "followerId",
        following_id AS "followingId",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    const result = await this.pool.query(query, [id, dbStatus]);
    const row = result.rows[0];
    return {
      ...row,
      status: row.status === 'ACCEPTED' ? 'active' : row.status.toLowerCase(),
    };
  }

  /**
   * Get followers count for a user
   */
  async getFollowersCount(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM follows
      WHERE following_id = $1 AND status = 'ACCEPTED'
    `;

    const result = await this.pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get following count for a user
   */
  async getFollowingCount(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM follows
      WHERE follower_id = $1 AND status = 'ACCEPTED'
    `;

    const result = await this.pool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }
}
