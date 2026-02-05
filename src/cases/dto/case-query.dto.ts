import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CaseQueryDto {
  @ApiPropertyOptional({ example: 'trabalhista' })
  @IsOptional()
  @IsString()
  ramo?: string;

  @ApiPropertyOptional({ example: 'ativo' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'TJSP' })
  @IsOptional()
  @IsString()
  tribunal?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-02-01' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
