/**
 * Group Member Repository
 * Data access layer for group membership
 */

import { Pool } from 'pg';

export interface GroupMemberRepositoryConfig {
  pool: Pool;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: Date;
}

export class GroupMemberRepository {
  private pool: Pool;

  constructor(config: GroupMemberRepositoryConfig) {
    this.pool = config.pool;
  }

  /**
   * Get list of group IDs that a user is a member of
   */
  async getUserGroupIds(userId: string): Promise<string[]> {
    const query = `
      SELECT group_id AS "groupId"
      FROM group_members
      WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows.map((row) => row.groupId);
  }

  /**
   * Check if a user is a member of a group
   */
  async isMember(groupId: string, userId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM group_members
      WHERE group_id = $1 AND user_id = $2
      LIMIT 1
    `;

    const result = await this.pool.query(query, [groupId, userId]);
    return result.rows.length > 0;
  }

  /**
   * Get a user's membership in a group
   */
  async getMembership(
    groupId: string,
    userId: string
  ): Promise<GroupMember | null> {
    const query = `
      SELECT
        group_id AS "groupId",
        user_id AS "userId",
        role,
        joined_at AS "joinedAt"
      FROM group_members
      WHERE group_id = $1 AND user_id = $2
    `;

    const result = await this.pool.query(query, [groupId, userId]);
    if (!result.rows[0]) return null;
    return {
      ...result.rows[0],
      role: this.mapRoleFromDb(result.rows[0].role),
    };
  }

  /**
   * Add a user to a group
   */
  async create(
    groupId: string,
    userId: string,
    role: 'owner' | 'moderator' | 'member' = 'member'
  ): Promise<GroupMember> {
    const dbRole = this.mapRoleToDb(role);
    const query = `
      INSERT INTO group_members (group_id, user_id, role)
      VALUES ($1, $2, $3::"GroupMemberRole")
      RETURNING
        group_id AS "groupId",
        user_id AS "userId",
        role,
        joined_at AS "joinedAt"
    `;

    const result = await this.pool.query(query, [groupId, userId, dbRole]);
    return {
      ...result.rows[0],
      role: this.mapRoleFromDb(result.rows[0].role),
    };
  }

  /**
   * Remove a user from a group
   */
  async delete(groupId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM group_members
      WHERE group_id = $1 AND user_id = $2
    `;

    const result = await this.pool.query(query, [groupId, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Update member's role
   */
  async updateRole(
    groupId: string,
    userId: string,
    role: 'owner' | 'moderator' | 'member'
  ): Promise<GroupMember> {
    const dbRole = this.mapRoleToDb(role);
    const query = `
      UPDATE group_members
      SET role = $3::"GroupMemberRole"
      WHERE group_id = $1 AND user_id = $2
      RETURNING
        group_id AS "groupId",
        user_id AS "userId",
        role,
        joined_at AS "joinedAt"
    `;

    const result = await this.pool.query(query, [groupId, userId, dbRole]);
    return {
      ...result.rows[0],
      role: this.mapRoleFromDb(result.rows[0].role),
    };
  }

  /**
   * Get member count for a group
   */
  async getMemberCount(groupId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM group_members
      WHERE group_id = $1
    `;

    const result = await this.pool.query(query, [groupId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get members of a group with pagination
   */
  async getMembers(
    groupId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<GroupMember[]> {
    const query = `
      SELECT
        group_id AS "groupId",
        user_id AS "userId",
        role,
        joined_at AS "joinedAt"
      FROM group_members
      WHERE group_id = $1
      ORDER BY
        CASE role
          WHEN 'ADMIN' THEN 1
          WHEN 'MODERATOR' THEN 2
          ELSE 3
        END,
        joined_at ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.pool.query(query, [groupId, limit, offset]);
    return result.rows.map((row) => ({
      ...row,
      role: this.mapRoleFromDb(row.role),
    }));
  }

  private mapRoleToDb(role: 'owner' | 'moderator' | 'member'): string {
    switch (role) {
      case 'owner': return 'ADMIN';
      case 'moderator': return 'MODERATOR';
      case 'member': return 'MEMBER';
      default: return 'MEMBER';
    }
  }

  private mapRoleFromDb(dbRole: string): 'owner' | 'moderator' | 'member' {
    switch (dbRole) {
      case 'ADMIN': return 'owner';
      case 'MODERATOR': return 'moderator';
      case 'MEMBER': return 'member';
      default: return 'member';
    }
  }
}
