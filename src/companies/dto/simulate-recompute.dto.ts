import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SimulateRecomputeDto {
  @ApiProperty({
    example: 'aggressive_settlement',
    description: 'Cenário de simulação (ex.: aggressive_settlement)',
  })
  @IsString()
  @IsOptional()
  scenario?: string;
}
