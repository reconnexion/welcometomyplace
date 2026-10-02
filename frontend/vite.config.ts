import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [react()],
    resolve: {
      // Without this, a `yarn link`ed @activitypods/refine-providers resolves react/antd/etc.
      // from its own node_modules (it has its own copies as devDependencies) instead of this
      // app's — Node's symlink resolution looks in the linked package's real directory first —
      // duplicating them in the bundle and risking context/hook mismatches between the two
      // copies. Forces a single resolved instance regardless of which node_modules it's found in;
      // harmless once installed from the registry (there's only one copy to dedupe anyway).
      dedupe: ['react', 'react-dom', 'antd', '@ant-design/icons', '@refinedev/core', '@refinedev/react-router', 'react-router']
    },
    server: {
      host: true,
      port: parseInt(env.VITE_PORT || '4002')
    },
    preview: {
      port: parseInt(env.VITE_PORT || '4002')
    },
    base: '/'
  };
});
