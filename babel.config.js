module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Добавляем плагин для алиасов путей
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            // Здесь указываем соответствие между путями "@/hooks/*" и реальными путями "hooks/*"
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