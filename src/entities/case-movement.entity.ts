import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Case } from './case.entity';

@Entity('case_movements')
export class CaseMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  case_process_id: string;

  @ManyToOne(() => Case, (c) => c.movimentacoes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'case_process_id' })
  caseEntity: Case;

  @Column({ type: 'varchar', length: 100 })
  tipo: string;

  @Column('date')
  data: Date;

  @Column('text', { nullable: true })
  descricao: string | null;
}
