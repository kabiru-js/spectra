import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReportIncidentDto, UpdateIncidentStatusDto } from './dto/incident.dto';

@Injectable()
export class IncidentService {
  constructor(private prisma: PrismaService) {}

  async reportIncident(dto: ReportIncidentDto) {
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const reporter = await this.prisma.user.findUnique({ where: { id: dto.reporterId } });
    if (!reporter) throw new NotFoundException('Reporter not found');

    return this.prisma.incident.create({
      data: {
        title: dto.title,
        description: dto.description,
        incidentType: dto.type,
        severity: dto.severity,
        status: 'OPEN',
        occurrenceTime: new Date(),
        siteId: dto.siteId,
        reporterId: dto.reporterId,
        reportedAt: new Date(),
        guardsInvolved: JSON.stringify(dto.involvedParties || []),
        photos: JSON.stringify(dto.mediaUrls || []),
        videos: '[]',
        voiceNotes: '[]',
        witnesses: '[]',
        actionsTaken: '',
        investigationStatus: 'OPEN',
      },
    });
  }

  async updateStatus(id: string, dto: UpdateIncidentStatusDto) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found');

    return this.prisma.incident.update({
      where: { id },
      data: {
        status: dto.status,
        resolutionNotes: dto.resolutionNotes,
      },
    });
  }

  async findAll(query: { page?: number; limit?: number; siteId?: string; status?: string; type?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.siteId) where.siteId = query.siteId;
    if (query.status) where.status = query.status;
    if (query.type) where.incidentType = query.type;

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where, skip, take: limit, orderBy: { reportedAt: 'desc' },
        include: {
          site: { select: { id: true, name: true, client: { select: { companyName: true } } } },
          reporter: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        site: { include: { client: true } },
        reporter: true,
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }
}
