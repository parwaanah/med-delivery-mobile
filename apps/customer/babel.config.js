module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@mobile/ui': '../../packages/ui',
            '@mobile/api': '../../packages/api',
            '@mobile/auth': '../../packages/auth',
            '@mobile/socket': '../../packages/socket',
            '@mobile/utils': '../../packages/utils'
          }
        }
      ]
    ]
  };
};
