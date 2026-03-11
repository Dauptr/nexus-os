import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const runtime = 'nodejs';

// GET - Export database backup
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'full';
    const download = searchParams.get('download') === 'true';

    const backup: Record<string, unknown> = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      type,
    };

    if (type === 'full' || type === 'users') {
      backup.users = await db.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          bio: true,
          photoUrl: true,
          isAdmin: true,
          isBanned: true,
          features: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    }

    if (type === 'full' || type === 'images') {
      backup.generatedImages = await db.generatedImage.findMany({
        select: {
          id: true,
          prompt: true,
          imageUrl: true,
          model: true,
          style: true,
          userId: true,
          createdAt: true,
        }
      });
    }

    if (type === 'full' || type === 'messages') {
      backup.chatMessages = await db.chatMessage.findMany({
        select: {
          id: true,
          role: true,
          content: true,
          userId: true,
          createdAt: true,
        }
      });
    }

    if (type === 'full' || type === 'p2p') {
      backup.p2pMessages = await db.p2PMessage.findMany({
        select: {
          id: true,
          content: true,
          fromUserId: true,
          toUserId: true,
          read: true,
          createdAt: true,
        }
      });
    }

    if (type === 'full' || type === 'invites') {
      backup.inviteLinks = await db.inviteLink.findMany({
        select: {
          id: true,
          code: true,
          creatorId: true,
          usedById: true,
          createdAt: true,
          usedAt: true,
        }
      });
    }

    if (type === 'full' || type === 'memories') {
      backup.claudeMemories = await db.claudeMemory.findMany({
        select: {
          id: true,
          category: true,
          key: true,
          content: true,
          metadata: true,
          importance: true,
          createdAt: true,
          lastAccessed: true,
          accessCount: true,
        }
      });
    }

    if (type === 'full' || type === 'notifications') {
      backup.notifications = await db.notification.findMany({
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          userId: true,
          read: true,
          createdAt: true,
        }
      });
    }

    if (type === 'full' || type === 'settings') {
      backup.appSettings = await db.appSettings.findMany({
        select: {
          id: true,
          key: true,
          value: true,
          updatedAt: true,
        }
      });
    }

    // Health check info
    backup.health = {
      database: 'connected',
      timestamp: new Date().toISOString(),
      counts: {
        users: await db.user.count(),
        images: await db.generatedImage.count(),
        chatMessages: await db.chatMessage.count(),
        p2pMessages: await db.p2PMessage.count(),
        inviteLinks: await db.inviteLink.count(),
        memories: await db.claudeMemory.count(),
        notifications: await db.notification.count(),
      }
    };

    if (download) {
      const filename = `nexus-backup-${new Date().toISOString().split('T')[0]}.json`;
      return new NextResponse(JSON.stringify(backup, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(backup);

  } catch (error: unknown) {
    console.error('Backup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage, health: { database: 'error', message: errorMessage } },
      { status: 500 }
    );
  }
}

// POST - Health check or create backup file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'backup-db') {
      // Create a SQLite database backup
      const dbPath = path.join(process.cwd(), 'db', 'custom.db');
      const backupPath = path.join(process.cwd(), 'backups', `backup-${Date.now()}.db`);
      
      try {
        await execAsync(`mkdir -p ${path.join(process.cwd(), 'backups')}`);
        await execAsync(`cp ${dbPath} ${backupPath}`);
        
        return NextResponse.json({
          success: true,
          message: 'Database backup created',
          path: backupPath,
          timestamp: new Date().toISOString(),
        });
      } catch (backupError) {
        console.error('DB backup error:', backupError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create database backup',
          details: String(backupError),
        }, { status: 500 });
      }
    }

    // Default: Health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'unknown',
      apis: {
        images: 'unknown',
        chat: 'unknown',
        auth: 'unknown',
        p2pChat: 'unknown',
        notifications: 'unknown',
      }
    };

    // Test database connection
    try {
      await db.$queryRaw`SELECT 1`;
      health.database = 'connected';
    } catch {
      health.database = 'error';
      health.status = 'degraded';
    }

    return NextResponse.json(health);

  } catch (error: unknown) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
