import path from 'node:path';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@incld/client',
    '@incld/react',
    '@incld/react-schedules',
    '@incld/react-approvals',
    '@incld/react-audit',
    '@incld/react-bulk',
  ],
  turbopack: {root: path.resolve(process.cwd(), '../..')},
};

export default nextConfig;
