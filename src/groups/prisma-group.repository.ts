/**
 * Prisma-backed Group Repository implementations
 * MVP: covers list, get, create, join, leave
 */

import { PrismaClient } from '@prisma/client';
import { GroupRepository, MemberRepository, RequestRepository, PermissionCache } from './group.service';
import { AuditLogger } from './membership.service';
import { Group, GroupMember, MembershipRequest, GroupRole, ModerationAction } from './group.types';

export class PrismaGroupRepository implements GroupRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Partial<Group>): Promise<Group> {
    const slug = (data.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const group = await this.prisma.group.create({
      data: {
        name: data.name!,
        slug: slug + '-' + Date.now().toString(36),
        description: data.description || null,
        ownerId: data.ownerId!,
        privacy: (data.privacy?.toUpperCase() || 'PUBLIC') as any,
        memberCount: 0,
        postCount: 0,
      },
    });
    return this.toDomain(group);
  }

  async findById(id: string): Promise<Group | null> {
    const group = await this.prisma.group.findUnique({ where: { id } });
    return group ? this.toDomain(group) : null;
  }

  async findByName(name: string): Promise<Group | null> {
    const group = await this.prisma.group.findFirst({ where: { name } });
    return group ? this.toDomain(group) : null;
  }

  async update(id: string, data: Partial<Group>): Promise<Group> {
    const group = await this.prisma.group.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.privacy && { privacy: data.privacy.toUpperCase() as any }),
      },
    });
    return this.toDomain(group);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.group.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async list(options?: { privacy?: string; page?: number; limit?: number }): Promise<Group[]> {
    const limit = options?.limit || 50;
    const skip = ((options?.page || 1) - 1) * limit;
    const groups = await this.prisma.group.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(options?.privacy && { privacy: options.privacy.toUpperCase() as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });
    return groups.map((g) => this.toDomain(g));
  }

  async incrementMemberCount(groupId: string): Promise<void> {
    await this.prisma.group.update({
      where: { id: groupId },
      data: { memberCount: { increment: 1 } },
    });
  }

  async decrementMemberCount(groupId: string): Promise<void> {
    await this.prisma.group.update({
      where: { id: groupId },
      data: { memberCount: { decrement: 1 } },
    });
  }

  private toDomain(g: any): Group {
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description,
      ownerId: g.ownerId,
      privacy: g.privacy.toLowerCase(),
      memberCount: g.memberCount,
      postCount: g.postCount,
      coverUrl: g.coverUrl,
      avatarUrl: g.avatarUrl,
      isActive: g.isActive,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }
}

export class PrismaMemberRepository implements MemberRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Partial<GroupMember>): Promise<GroupMember> {
    const member = await this.prisma.groupMember.create({
      data: {
        groupId: data.groupId!,
        userId: data.userId!,
        role: (data.role?.toUpperCase() || 'MEMBER') as any,
      },
    });
    return this.toDomain(member);
  }

  async findByGroupAndUser(groupId: string, userId: string): Promise<GroupMember | null> {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    return member ? this.toDomain(member) : null;
  }

  async findByGroup(groupId: string): Promise<GroupMember[]> {
    const members = await this.prisma.groupMember.findMany({ where: { groupId } });
    return members.map((m) => this.toDomain(m));
  }

  async findByUser(userId: string): Promise<GroupMember[]> {
    const members = await this.prisma.groupMember.findMany({ where: { userId } });
    return members.map((m) => this.toDomain(m));
  }

  async update(id: string, data: Partial<GroupMember>): Promise<GroupMember> {
    const member = await this.prisma.groupMember.update({
      where: { id },
      data: {
        ...(data.role && { role: data.role.toUpperCase() as any }),
      },
    });
    return this.toDomain(member);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.groupMember.delete({ where: { id } });
  }

  async countByGroup(groupId: string): Promise<number> {
    return this.prisma.groupMember.count({ where: { groupId } });
  }

  private toDomain(m: any): GroupMember {
    return {
      id: m.id,
      groupId: m.groupId,
      userId: m.userId,
      role: m.role.toLowerCase() as GroupRole,
      joinedAt: m.joinedAt,
    };
  }
}

// MVP no-op implementations

export class NoopRequestRepository implements RequestRepository {
  async create(data: Partial<MembershipRequest>): Promise<MembershipRequest> {
    return { id: '', groupId: '', userId: '', status: 'pending', createdAt: new Date() } as any;
  }
  async findById(): Promise<MembershipRequest | null> { return null; }
  async findPendingByGroupAndUser(): Promise<MembershipRequest | null> { return null; }
  async update(id: string, data: Partial<MembershipRequest>): Promise<MembershipRequest> {
    return { id, ...data } as any;
  }
  async delete(): Promise<void> {}
}

export class NoopPermissionCache implements PermissionCache {
  async get(): Promise<unknown> { return null; }
  async set(): Promise<void> {}
  async delete(): Promise<void> {}
  async deletePattern(): Promise<void> {}
}

export class NoopAuditLogger implements AuditLogger {
  async log(entry: {
    action: ModerationAction;
    groupId: string;
    moderatorId: string;
    targetUserId?: string;
    targetResourceId?: string;
    reason: string;
    additionalData?: Record<string, unknown>;
  }): Promise<void> {
    // MVP: no-op
  }
}
