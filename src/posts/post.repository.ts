/**
 * Post Repository
 * Data access layer for posts using PostgreSQL
 */

import { Pool } from 'pg';
import {
  Post,
  CreatePostInput,
  UpdatePostInput,
  PostWithAuthor,
} from './types';

export interface PostRepositoryConfig {
  pool: Pool;
}

export class PostRepository {
  private pool: Pool;

  constructor(config: PostRepositoryConfig) {
    this.pool = config.pool;
  }

  /**
   * Create a new post
   */
  async create(input: CreatePostInput): Promise<Post> {
    const visibility = (input.visibility || 'public').toUpperCase();

    const query = `
      INSERT INTO posts (
        author_id,
        content,
        group_id,
        visibility,
        media_urls,
        reaction_count,
        comment_count,
        share_count,
        is_pinned,
        is_edited
      ) VALUES ($1, $2, $3, $4::"PostVisibility", $5, 0, 0, 0, false, false)
      RETURNING
        id,
        author_id AS "authorId",
        content,
        group_id AS "groupId",
        visibility,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        reaction_count AS "likesCount",
        comment_count AS "commentsCount",
        share_count AS "sharesCount",
        is_pinned AS "isPinned",
        is_edited AS "isEdited",
        deleted_at AS "deletedAt",
        media_urls AS "mediaUrls"
    `;

    const values = [
      input.authorId,
      input.content,
      input.groupId || null,
      visibility,
      input.mediaUrls || [],
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];
    return {
      ...row,
      isDeleted: row.deletedAt != null,
      status: 'published',
    };
  }

  /**
   * Find post by ID
   */
  async findById(id: string): Promise<Post | null> {
    const query = `
      SELECT
        id,
        author_id AS "authorId",
        content,
        group_id AS "groupId",
        visibility,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        reaction_count AS "likesCount",
        comment_count AS "commentsCount",
        share_count AS "sharesCount",
        is_pinned AS "isPinned",
        is_edited AS "isEdited",
        deleted_at AS "deletedAt",
        media_urls AS "mediaUrls"
      FROM posts
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      ...row,
      isDeleted: row.deletedAt != null,
      status: 'published',
    };
  }

  /**
   * Find post by ID with author information
   */
  async findByIdWithAuthor(id: string): Promise<PostWithAuthor | null> {
    const query = `
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
        p.is_edited AS "isEdited",
        p.deleted_at AS "deletedAt",
        p.media_urls AS "mediaUrls",
        json_build_object(
          'id', u.id,
          'username', u.username,
          'profilePictureUrl', up.avatar_url
        ) AS author,
        CASE
          WHEN g.id IS NOT NULL THEN json_build_object('id', g.id, 'name', g.name)
          ELSE NULL
        END AS group
      FROM posts p
      INNER JOIN users u ON p.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN groups g ON p.group_id = g.id
      WHERE p.id = $1
    `;

    const result = await this.pool.query(query, [id]);
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      ...row,
      isDeleted: row.deletedAt != null,
      status: 'published',
    };
  }

  /**
   * Update a post
   */
  async update(id: string, input: UpdatePostInput): Promise<Post> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(input.content);
    }

    if (input.visibility !== undefined) {
      updates.push(`visibility = $${paramIndex++}::"PostVisibility"`);
      values.push(input.visibility.toUpperCase());
    }

    if (input.mediaUrls !== undefined) {
      updates.push(`media_urls = $${paramIndex++}`);
      values.push(input.mediaUrls);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    updates.push(`is_edited = true`);
    values.push(id);

    const query = `
      UPDATE posts
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        author_id AS "authorId",
        content,
        group_id AS "groupId",
        visibility,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        reaction_count AS "likesCount",
        comment_count AS "commentsCount",
        share_count AS "sharesCount",
        is_pinned AS "isPinned",
        is_edited AS "isEdited",
        deleted_at AS "deletedAt",
        media_urls AS "mediaUrls"
    `;

    const result = await this.pool.query(query, values);
    const row = result.rows[0];
    return {
      ...row,
      isDeleted: row.deletedAt != null,
      status: 'published',
    };
  }

  /**
   * Soft delete a post
   */
  async softDelete(id: string): Promise<Post> {
    const query = `
      UPDATE posts
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING
        id,
        author_id AS "authorId",
        content,
        group_id AS "groupId",
        visibility,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        reaction_count AS "likesCount",
        comment_count AS "commentsCount",
        share_count AS "sharesCount",
        is_pinned AS "isPinned",
        is_edited AS "isEdited",
        deleted_at AS "deletedAt",
        media_urls AS "mediaUrls"
    `;

    const result = await this.pool.query(query, [id]);
    const row = result.rows[0];
    return {
      ...row,
      isDeleted: true,
      status: 'published',
    };
  }

  /**
   * Find posts by author
   */
  async findByAuthor(
    authorId: string,
    limit: number = 20,
    cursor?: Date
  ): Promise<Post[]> {
    const query = `
      SELECT
        id,
        author_id AS "authorId",
        content,
        group_id AS "groupId",
        visibility,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        reaction_count AS "likesCount",
        comment_count AS "commentsCount",
        share_count AS "sharesCount",
        is_pinned AS "isPinned",
        is_edited AS "isEdited",
        deleted_at AS "deletedAt",
        media_urls AS "mediaUrls"
      FROM posts
      WHERE author_id = $1
        AND deleted_at IS NULL
        ${cursor ? 'AND created_at < $3' : ''}
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const values = cursor ? [authorId, limit, cursor] : [authorId, limit];
    const result = await this.pool.query(query, values);
    return result.rows.map((row) => ({
      ...row,
      isDeleted: false,
      status: 'published' as const,
    }));
  }

  /**
   * Find posts by group
   */
  async findByGroup(
    groupId: string,
    limit: number = 20,
    cursor?: Date
  ): Promise<Post[]> {
    const query = `
      SELECT
        id,
        author_id AS "authorId",
        content,
        group_id AS "groupId",
        visibility,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        reaction_count AS "likesCount",
        comment_count AS "commentsCount",
        share_count AS "sharesCount",
        is_pinned AS "isPinned",
        is_edited AS "isEdited",
        deleted_at AS "deletedAt",
        media_urls AS "mediaUrls"
      FROM posts
      WHERE group_id = $1
        AND deleted_at IS NULL
        ${cursor ? 'AND created_at < $3' : ''}
      ORDER BY is_pinned DESC, created_at DESC
      LIMIT $2
    `;

    const values = cursor ? [groupId, limit, cursor] : [groupId, limit];
    const result = await this.pool.query(query, values);
    return result.rows.map((row) => ({
      ...row,
      isDeleted: false,
      status: 'published' as const,
    }));
  }

  /**
   * Increment reaction count
   */
  async incrementLikesCount(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = $1`,
      [id]
    );
  }

  /**
   * Decrement reaction count
   */
  async decrementLikesCount(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE posts SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = $1`,
      [id]
    );
  }

  /**
   * Increment comments count
   */
  async incrementCommentsCount(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`,
      [id]
    );
  }

  /**
   * Decrement comments count
   */
  async decrementCommentsCount(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1`,
      [id]
    );
  }
}
