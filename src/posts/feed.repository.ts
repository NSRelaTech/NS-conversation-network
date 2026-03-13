/**
 * Feed Repository
 * Data access layer for feed queries with optimized SQL
 */

import { Pool } from 'pg';
import { FeedItem, FeedQuery } from './types';

export interface FeedRepositoryConfig {
  pool: Pool;
}

export class FeedRepository {
  private pool: Pool;

  constructor(config: FeedRepositoryConfig) {
    this.pool = config.pool;
  }

  /**
   * Get home feed for a user
   * Posts from followed users and joined groups
   * Uses cursor-based pagination
   */
  private orderByClause(sort?: string): string {
    if (sort === 'popular') {
      return 'p.is_pinned DESC, (p.reaction_count + p.comment_count * 2) DESC, p.created_at DESC';
    }
    return 'p.is_pinned DESC, p.created_at DESC';
  }

  async getHomeFeed(query: FeedQuery): Promise<FeedItem[]> {
    const { userId, followingIds, groupIds, cursor, limit } = query;

    const cursorTimestamp = cursor || new Date();
    const values: unknown[] = [];
    let paramIndex = 1;

    // Always include user's own posts
    const conditions: string[] = [];
    values.push(userId);
    conditions.push(`p.author_id = $${paramIndex++}`);

    // Build the WHERE clause for following IDs
    if (followingIds && followingIds.length > 0) {
      conditions.push(`p.author_id = ANY($${paramIndex++})`);
      values.push(followingIds);
    }

    // Build the WHERE clause for group IDs
    if (groupIds && groupIds.length > 0) {
      conditions.push(`p.group_id = ANY($${paramIndex++})`);
      values.push(groupIds);
    }

    // Combine conditions with OR
    const sourceCondition = `(${conditions.join(' OR ')})`;

    values.push(cursorTimestamp);
    const cursorParamIndex = paramIndex++;

    values.push(limit);
    const limitParamIndex = paramIndex++;

    values.push(userId);
    const userReactionParamIndex = paramIndex++;

    const sql = `
      SELECT
        p.id,
        p.author_id AS "authorId",
        p.content,
        p.group_id AS "groupId",
        p.visibility,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        p.reaction_count AS "likesCount",
        p.comment_count AS "commentsCount",
        p.share_count AS "sharesCount",
        p.is_pinned AS "isPinned",
        p.deleted_at AS "deletedAt",
        p.media_urls AS "mediaUrls",
        json_build_object(
          'id', u.id,
          'username', u.username,
          'displayName', up.display_name,
          'profilePictureUrl', up.avatar_url
        ) AS author,
        CASE
          WHEN g.id IS NOT NULL THEN json_build_object('id', g.id, 'name', g.name)
          ELSE NULL
        END AS group,
        (p.reaction_count + p.comment_count * 2) AS "engagementScore",
        pr.type AS "userReaction"
      FROM posts p
      INNER JOIN users u ON p.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN groups g ON p.group_id = g.id
      LEFT JOIN post_reactions pr ON pr.post_id = p.id AND pr.user_id = $${userReactionParamIndex}
      WHERE
        p.deleted_at IS NULL
        AND p.created_at < $${cursorParamIndex}
        AND ${sourceCondition}
      ORDER BY
        ${this.orderByClause(query.sort)}
      LIMIT $${limitParamIndex}
    `;

    const result = await this.pool.query(sql, values);
    return result.rows.map((row) => ({
      ...row,
      isDeleted: false,
      status: 'published' as const,
    }));
  }

  /**
   * Get group feed
   * Posts from a specific group
   */
  async getGroupFeed(query: FeedQuery): Promise<FeedItem[]> {
    const { groupId, userId, cursor, limit } = query;
    const cursorTimestamp = cursor || new Date();

    const sql = `
      SELECT
        p.id,
        p.author_id AS "authorId",
        p.content,
        p.group_id AS "groupId",
        p.visibility,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        p.reaction_count AS "likesCount",
        p.comment_count AS "commentsCount",
        p.share_count AS "sharesCount",
        p.is_pinned AS "isPinned",
        p.deleted_at AS "deletedAt",
        p.media_urls AS "mediaUrls",
        json_build_object(
          'id', u.id,
          'username', u.username,
          'displayName', up.display_name,
          'profilePictureUrl', up.avatar_url
        ) AS author,
        json_build_object('id', g.id, 'name', g.name) AS group,
        (p.reaction_count + p.comment_count * 2) AS "engagementScore",
        pr.type AS "userReaction"
      FROM posts p
      INNER JOIN users u ON p.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      INNER JOIN groups g ON p.group_id = g.id
      LEFT JOIN post_reactions pr ON pr.post_id = p.id AND pr.user_id = $4
      WHERE
        p.group_id = $1
        AND p.deleted_at IS NULL
        AND p.created_at < $2
      ORDER BY
        ${this.orderByClause(query.sort)}
      LIMIT $3
    `;

    const result = await this.pool.query(sql, [groupId, cursorTimestamp, limit, userId]);
    return result.rows.map((row) => ({
      ...row,
      isDeleted: false,
      status: 'published' as const,
    }));
  }

  /**
   * Get user profile feed
   * Posts from a specific user
   */
  async getUserProfileFeed(query: FeedQuery): Promise<FeedItem[]> {
    const { userId, viewerId, cursor, limit } = query;
    const cursorTimestamp = cursor || new Date();

    const sql = `
      SELECT
        p.id,
        p.author_id AS "authorId",
        p.content,
        p.group_id AS "groupId",
        p.visibility,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        p.reaction_count AS "likesCount",
        p.comment_count AS "commentsCount",
        p.share_count AS "sharesCount",
        p.is_pinned AS "isPinned",
        p.deleted_at AS "deletedAt",
        p.media_urls AS "mediaUrls",
        json_build_object(
          'id', u.id,
          'username', u.username,
          'displayName', up.display_name,
          'profilePictureUrl', up.avatar_url
        ) AS author,
        CASE
          WHEN g.id IS NOT NULL THEN json_build_object('id', g.id, 'name', g.name)
          ELSE NULL
        END AS group,
        (p.reaction_count + p.comment_count * 2) AS "engagementScore",
        pr.type AS "userReaction"
      FROM posts p
      INNER JOIN users u ON p.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN groups g ON p.group_id = g.id
      LEFT JOIN post_reactions pr ON pr.post_id = p.id AND pr.user_id = $4
      WHERE
        p.author_id = $1
        AND p.deleted_at IS NULL
        AND p.visibility IN ('PUBLIC', 'GROUP')
        AND p.created_at < $2
      ORDER BY
        ${this.orderByClause(query.sort)}
      LIMIT $3
    `;

    const result = await this.pool.query(sql, [userId, cursorTimestamp, limit, viewerId || null]);
    return result.rows.map((row) => ({
      ...row,
      isDeleted: false,
      status: 'published' as const,
    }));
  }
}
