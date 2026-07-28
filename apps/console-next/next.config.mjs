const isolatedDistDir = process.env.FACTORY_CONSOLE_DIST_DIR;

if (isolatedDistDir && !/^[A-Za-z0-9._-]+$/.test(isolatedDistDir)) {
  throw new Error('FACTORY_CONSOLE_DIST_DIR must be a simple local directory name.');
}

/** @type {import('next').NextConfig} */
export default {
  distDir: isolatedDistDir || '.next',
};
