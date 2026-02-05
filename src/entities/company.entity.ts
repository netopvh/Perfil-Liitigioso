import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Case } from './case.entity';

@Entity('companies')
export class Company {
  @PrimaryColumn({ type: 'varchar', length: 18 })
  cnpj: string;

  @Column({ type: 'varchar', length: 255 })
  razao_social: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nome_fantasia: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  setor: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  porte: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  uf_sede: string | null;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  risco_score: number;

  @Column({ type: 'varchar', length: 20, default: 'baixo' })
  classificacao: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  last_updated: Date;

  @OneToMany(() => Case, (c) => c.company)
  cases: Case[];
}
