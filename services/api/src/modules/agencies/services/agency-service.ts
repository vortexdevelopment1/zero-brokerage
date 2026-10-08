import type { Pool } from "pg";
import { NotFoundError, BadRequestError } from "../../../common/errors/index.js";
import { AgencyRepository } from "../repositories/agency-repository.js";
import type {
  Agency,
  AgencyMember,
  AgencyStatus,
  AddAgencyMemberParams,
  CreateAgencyParams,
  ListAgenciesParams,
} from "../types.js";
import type { PaginatedResponse } from "../../../common/pagination/index.js";

export class AgencyService {
  private readonly agencyRepo: AgencyRepository;

  constructor(private readonly pool: Pool) {
    this.agencyRepo = new AgencyRepository(pool);
  }

  async listAgencies(params: ListAgenciesParams): Promise<PaginatedResponse<Agency>> {
    return this.agencyRepo.listAgencies(params);
  }

  async getAgencyById(id: string): Promise<Agency> {
    const agency = await this.agencyRepo.findById(id);
    if (!agency) {
      throw new NotFoundError(`Agency with id "${id}" was not found.`);
    }
    return agency;
  }

  async createAgency(params: CreateAgencyParams): Promise<Agency> {
    const existing = await this.agencyRepo.findBySlug(params.slug);
    if (existing) {
      throw new BadRequestError(`Agency with slug "${params.slug}" already exists.`);
    }
    return this.agencyRepo.createAgency(params);
  }

  async approveAgency(id: string): Promise<Agency> {
    await this.getAgencyById(id);
    const updated = await this.agencyRepo.updateStatus(id, "ACTIVE");
    if (!updated) {
      throw new NotFoundError(`Agency with id "${id}" was not found.`);
    }
    return updated;
  }

  async rejectAgency(id: string, _reason?: string): Promise<Agency> {
    await this.getAgencyById(id);
    const updated = await this.agencyRepo.updateStatus(id, "TERMINATED");
    if (!updated) {
      throw new NotFoundError(`Agency with id "${id}" was not found.`);
    }
    return updated;
  }

  async updateAgencyStatus(id: string, status: AgencyStatus): Promise<Agency> {
    await this.getAgencyById(id);
    const updated = await this.agencyRepo.updateStatus(id, status);
    if (!updated) {
      throw new NotFoundError(`Agency with id "${id}" was not found.`);
    }
    return updated;
  }

  async addMember(params: AddAgencyMemberParams): Promise<AgencyMember> {
    await this.getAgencyById(params.agencyId);
    return this.agencyRepo.addMember(params);
  }

  async getAgencyMembers(agencyId: string): Promise<AgencyMember[]> {
    await this.getAgencyById(agencyId);
    return this.agencyRepo.findMembers(agencyId);
  }
}
