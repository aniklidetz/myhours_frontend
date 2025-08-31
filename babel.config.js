module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add plugin for path aliases
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            // Here we specify mapping between "@/hooks/*" paths and real "hooks/*" paths
            '@/hooks': './hooks',
            '@/components': './components',
            '@/constants': './constants',
            '@/src': './src',
          },
        },
      ],
    ],
  };
};
