import { ApiProperty } from '@nestjs/swagger';

export class CaseListItemDto {
  @ApiProperty()
  process_id: string;

  @ApiProperty()
  numero_cnj: string;

  @ApiProperty()
  tribunal: string;

  @ApiProperty()
  ramo: string;

  @ApiProperty()
  classe: string;

  @ApiProperty({ type: [String], nullable: true })
  assuntos: string[] | null;

  @ApiProperty()
  polo: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  fase: string | null;

  @ApiProperty()
  data_distribuicao: string;

  @ApiProperty()
  data_ultima_movimentacao: string;

  @ApiProperty()
  valor_causa: number;

  @ApiProperty({ nullable: true })
  desfecho: string | null;
}

export class CaseListResponseDto {
  @ApiProperty({ type: [CaseListItemDto] })
  data: CaseListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
