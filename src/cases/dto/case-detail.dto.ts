import { ApiProperty } from '@nestjs/swagger';

export class MovimentacaoDto {
  @ApiProperty()
  tipo: string;

  @ApiProperty()
  data: string;

  @ApiProperty({ nullable: true })
  descricao: string | null;
}

export class CaseDetailResponseDto {
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

  @ApiProperty()
  probabilidade_condenacao: number;

  @ApiProperty({ nullable: true })
  desfecho: string | null;

  @ApiProperty({ nullable: true })
  custos_estimados: { min: number; max: number } | null;

  @ApiProperty({ type: [MovimentacaoDto] })
  movimentacoes: MovimentacaoDto[];
}
