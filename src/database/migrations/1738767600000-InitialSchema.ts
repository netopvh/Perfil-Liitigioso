import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738767600000 implements MigrationInterface {
  name = 'InitialSchema1738767600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`companies\` (
        \`cnpj\` varchar(18) NOT NULL,
        \`razao_social\` varchar(255) NOT NULL,
        \`nome_fantasia\` varchar(255) NULL,
        \`setor\` varchar(100) NULL,
        \`porte\` varchar(50) NULL,
        \`uf_sede\` varchar(2) NULL,
        \`risco_score\` decimal(5,2) NOT NULL DEFAULT 0,
        \`classificacao\` varchar(20) NOT NULL DEFAULT 'baixo',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`cnpj\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`cases\` (
        \`process_id\` char(36) NOT NULL,
        \`company_cnpj\` varchar(18) NOT NULL,
        \`numero_cnj\` varchar(25) NOT NULL,
        \`tribunal\` varchar(20) NOT NULL,
        \`ramo\` varchar(50) NOT NULL,
        \`classe\` varchar(150) NOT NULL,
        \`assuntos\` json NULL,
        \`polo\` varchar(10) NOT NULL,
        \`status\` varchar(20) NOT NULL,
        \`fase\` varchar(30) NULL,
        \`data_distribuicao\` date NOT NULL,
        \`data_ultima_movimentacao\` date NOT NULL,
        \`valor_causa\` decimal(18,2) NOT NULL DEFAULT 0,
        \`probabilidade_condenacao\` decimal(5,4) NOT NULL DEFAULT 0,
        \`desfecho\` varchar(30) NULL,
        \`custos_estimados\` json NULL,
        \`segredo_justica\` tinyint NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`process_id\`),
        CONSTRAINT \`fk_cases_company\` FOREIGN KEY (\`company_cnpj\`) REFERENCES \`companies\`(\`cnpj\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`case_movements\` (
        \`id\` char(36) NOT NULL,
        \`case_process_id\` char(36) NOT NULL,
        \`tipo\` varchar(100) NOT NULL,
        \`data\` date NOT NULL,
        \`descricao\` text NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_movements_case\` FOREIGN KEY (\`case_process_id\`) REFERENCES \`cases\`(\`process_id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `case_movements`');
    await queryRunner.query('DROP TABLE IF EXISTS `cases`');
    await queryRunner.query('DROP TABLE IF EXISTS `companies`');
  }
}
