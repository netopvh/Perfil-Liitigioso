import { dataSource } from './data-source';

async function run(): Promise<void> {
  try {
    await dataSource.initialize();
    const executed = await dataSource.runMigrations();
    console.log(
      executed.length > 0
        ? `Migrations executadas: ${executed.map((m) => m.name).join(', ')}`
        : 'Nenhuma migration pendente.',
    );
  } catch (err) {
    console.error('Erro ao executar migrations:', err);
    process.exit(1);
  } finally {
    await dataSource.destroy().catch(() => {});
  }
}

run();
