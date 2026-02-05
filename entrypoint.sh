#!/bin/sh
set -e
echo "Executando migrations..."
node dist/database/run-migrations.js
echo "Iniciando aplicação..."
exec node dist/main.js
