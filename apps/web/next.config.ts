import type { NextConfig } from 'next';

const config: NextConfig = {
  // Los paquetes del monorepo se transpilan (exponen TS/TSX directamente).
  transpilePackages: ['@kaypi/ui', '@kaypi/shared', '@kaypi/db'],
  // @libsql/client trae binarios nativos → no se debe empaquetar; corre como módulo Node.
  serverExternalPackages: ['@libsql/client', 'libsql', '@react-pdf/renderer'],
};

export default config;
