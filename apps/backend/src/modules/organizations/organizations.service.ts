import { Injectable } from '@nestjs/common';
import { DEFAULT_ORGANIZATION_ID } from '../../common/repository/tenant-context';
import { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(private readonly repository: OrganizationsRepository) {}

  getDefaultOrganization() {
    return this.repository.findById(DEFAULT_ORGANIZATION_ID);
  }
}
