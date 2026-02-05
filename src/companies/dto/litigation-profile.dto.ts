import { ApiProperty } from '@nestjs/swagger';

export class ScoreDriverDto {
  @ApiProperty({ example: 'volume_12m' })
  key: string;

  @ApiProperty({ example: 0.28 })
  impact: number;
}

export class ScoreDto {
  @ApiProperty({ example: 78 })
  value: number;

  @ApiProperty({ example: 'alto' })
  classification: string;

  @ApiProperty({ type: [ScoreDriverDto] })
  drivers: ScoreDriverDto[];
}

export class KpisDto {
  @ApiProperty()
  total_cases: number;

  @ApiProperty()
  active_cases: number;

  @ApiProperty()
  new_cases_12m: number;

  @ApiProperty()
  settlement_rate: number;

  @ApiProperty()
  estimated_conviction_rate: number;

  @ApiProperty()
  value_at_risk: number;

  @ApiProperty()
  avg_resolution_days: number;
}

export class BranchCountDto {
  @ApiProperty()
  branch: string;

  @ApiProperty()
  count: number;
}

export class SubjectCountDto {
  @ApiProperty()
  subject: string;

  @ApiProperty()
  count: number;
}

export class BreakdownsDto {
  @ApiProperty({ type: [BranchCountDto] })
  by_branch: BranchCountDto[];

  @ApiProperty({ type: [SubjectCountDto] })
  top_subjects: SubjectCountDto[];
}

export class Series12mItemDto {
  @ApiProperty({ example: '2025-03' })
  month: string;

  @ApiProperty()
  opened: number;

  @ApiProperty()
  closed: number;
}

export class LitigationProfileResponseDto {
  @ApiProperty({ type: () => Object })
  company: {
    cnpj: string;
    razao_social: string;
    setor?: string;
    uf_sede?: string;
  };

  @ApiProperty({ type: ScoreDto })
  score: ScoreDto;

  @ApiProperty({ type: KpisDto })
  kpis: KpisDto;

  @ApiProperty({ type: BreakdownsDto })
  breakdowns: BreakdownsDto;

  @ApiProperty({ type: [Series12mItemDto] })
  series_12m: Series12mItemDto[];

  @ApiProperty()
  updated_at: string;
}
