import { ApiProperty } from '@nestjs/swagger';

export class CompanySummaryDto {
  @ApiProperty({ example: '12.345.678/0001-99' })
  cnpj: string;

  @ApiProperty({ example: 'ACME COMERCIO LTDA' })
  razao_social: string;

  @ApiProperty({ example: 'varejo', nullable: true })
  setor?: string;

  @ApiProperty({ example: 'SP', nullable: true })
  uf_sede?: string;

  @ApiProperty({ example: 78 })
  risco_score: number;

  @ApiProperty({ example: 'alto' })
  classificacao: string;

  @ApiProperty()
  last_updated: string;
}

export class CompanySearchItemDto extends CompanySummaryDto {
  @ApiProperty({ nullable: true })
  nome_fantasia?: string;

  @ApiProperty({ nullable: true })
  porte?: string;
}
