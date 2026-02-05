import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Company } from './company.entity';
import { CaseMovement } from './case-movement.entity';

@Entity('cases')
export class Case {
  @PrimaryColumn('uuid')
  process_id: string;

  @Column({ type: 'varchar', length: 18 })
  company_cnpj: string;

  @ManyToOne(() => Company, (c) => c.cases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_cnpj' })
  company: Company;

  @Column({ type: 'varchar', length: 25 })
  numero_cnj: string;

  @Column({ type: 'varchar', length: 20 })
  tribunal: string;

  @Column({ type: 'varchar', length: 50 })
  ramo: string;

  @Column({ type: 'varchar', length: 150 })
  classe: string;

  @Column('json', { nullable: true })
  assuntos: string[] | null;

  @Column({ type: 'varchar', length: 10 })
  polo: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  fase: string | null;

  @Column('date')
  data_distribuicao: Date;

  @Column('date')
  data_ultima_movimentacao: Date;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  valor_causa: number;

  @Column('decimal', { precision: 5, scale: 4, default: 0 })
  probabilidade_condenacao: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  desfecho: string | null;

  @Column('json', { nullable: true })
  custos_estimados: { min: number; max: number } | null;

  @Column({ default: false })
  segredo_justica: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => CaseMovement, (m) => m.caseEntity, { cascade: true })
  movimentacoes: CaseMovement[];
}
